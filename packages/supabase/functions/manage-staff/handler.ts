
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function createHandler(createClient: (...args: any[]) => any, env: (name: string) => string | undefined) {
return async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  let rollback: (() => Promise<boolean>) | null = null
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Encabezado de autorización ausente' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createClient(
      env('SUPABASE_URL')!,
      env('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerAuth, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !callerAuth.user) {
      return new Response(JSON.stringify({ error: 'Sesión no válida o expirada' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isSuperAdmin = callerAuth.user.app_metadata?.is_super_admin === true

    if (isSuperAdmin) {
      let tokenAal = 'aal1'
      try {
        const jwtPayload = JSON.parse(atob(token.split('.')[1]))
        tokenAal = jwtPayload.aal || 'aal1'
      } catch {
        tokenAal = 'aal1'
      }

      const verifiedMfaFactors = (callerAuth.user.factors || []).filter(
        (f: any) => f.status === 'verified'
      )
      if (verifiedMfaFactors.length > 0 && tokenAal !== 'aal2') {
        return new Response(
          JSON.stringify({ error: 'Se requiere verificación en dos pasos (AAL2) para ejecutar esta acción' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let callerProfile: { id: string; store_id: string; role: string; is_active: boolean } | null = null

    if (!isSuperAdmin) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, store_id, role, is_active')
        .eq('id', callerAuth.user.id)
        .single()

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: 'Perfil de usuario no encontrado' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (profile.is_active !== true || !['owner', 'admin'].includes(profile.role)) {
        return new Response(
          JSON.stringify({ error: 'No posee permisos administrativos para gestionar colaboradores' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      callerProfile = profile
    }

    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'JSON no válido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(JSON.stringify({ error: 'Solicitud no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { action } = body
    const targetStoreId = isSuperAdmin ? (body.storeId || callerProfile?.store_id) : callerProfile?.store_id

    if (!targetStoreId && action !== 'reset-password') {
      return new Response(JSON.stringify({ error: 'storeId es obligatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isSuperAdmin) {
      const supabaseUser = createClient(
        env('SUPABASE_URL')!,
        env('SUPABASE_ANON_KEY')!,
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )
      const { data: authorizedStoreId, error: moduleError } = await supabaseUser.rpc(
        'require_active_module',
        { p_module_id: 'staff', p_permission: 'staff:manage' }
      )
      if (moduleError?.code === '42501' || (!moduleError && authorizedStoreId !== callerProfile?.store_id)) {
        return new Response(JSON.stringify({ error: 'Módulo de colaboradores no habilitado' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (moduleError) {
        return new Response(JSON.stringify({ error: 'No se pudo verificar el acceso al módulo' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Resolve membership before any privileged Auth or profile mutation. A filtered
    // DELETE that affects zero rows is not evidence that the target belongs here.
    if (['update-role', 'toggle-status', 'reset-password', 'delete'].includes(action)) {
      if (!body.userId || typeof body.userId !== 'string') return new Response(JSON.stringify({ error: 'userId requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const { data: target, error: targetError } = await supabaseAdmin.from('users')
        .select('id, store_id, role').eq('id', body.userId).single()
      if (targetError || !target || (targetStoreId && target.store_id !== targetStoreId)) {
        return new Response(JSON.stringify({ error: 'No autorizado para este usuario' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (!isSuperAdmin && (
        (target.role === 'owner' && !(action === 'reset-password' && target.id === callerProfile?.id)) ||
        (callerProfile?.role === 'admin' && target.role === 'admin') ||
        (action === 'update-role' && target.id === callerProfile?.id)
      )) {
        return new Response(JSON.stringify({ error: 'No autorizado para modificar este rol protegido' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (action === 'create' || action === 'invite') {
      const { email, fullName, role, password } = body

      if (!email || !fullName || !role) {
        return new Response(
          JSON.stringify({ error: 'Nombre completo, correo y rol son obligatorios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validRoles = ['owner', 'admin', 'cashier', 'stock_clerk']
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'Rol no válido para este comercio' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!isSuperAdmin && callerProfile?.role !== 'owner' && (role === 'owner' || role === 'admin')) {
        return new Response(
          JSON.stringify({ error: 'Solo el propietario de la tienda puede asignar roles de encargado o dueño' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof fullName !== 'string' || !fullName.trim() || (password != null && (typeof password !== 'string' || password.trim().length < 6))) {
        return new Response(JSON.stringify({ error: 'Nombre, correo o contraseña no válidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: store, error: storeError } = await supabaseAdmin.from('stores')
        .select('feature_overrides, plans(features)').eq('id', targetStoreId).single()
      const plan = Array.isArray(store?.plans) ? store.plans[0] : store?.plans
      const maxUsers = Number(store?.feature_overrides?.max_users ?? plan?.features?.max_users)
      const { count, error: countError } = await supabaseAdmin.from('users')
        .select('id', { count: 'exact', head: true }).eq('store_id', targetStoreId)
      if (storeError || !store || countError || count == null || !Number.isFinite(maxUsers) || maxUsers < 1) {
        return new Response(JSON.stringify({ error: 'No se pudo verificar el límite de colaboradores' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (count >= maxUsers) return new Response(JSON.stringify({ error: 'Se alcanzó el límite de colaboradores del plan' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      let userId: string

      if (password && password.trim().length >= 6) {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password.trim(),
          email_confirm: true,
          user_metadata: { full_name: fullName },
        })

        if (createError || !created.user) {
          return new Response(
            JSON.stringify({ error: createError?.message ?? 'No se pudo crear el usuario' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userId = created.user.id
      } else {
        const { data: invited, error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name: fullName },
          })

        if (inviteError || !invited.user) {
          return new Response(
            JSON.stringify({ error: inviteError?.message ?? 'No se pudo enviar la invitación' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        userId = invited.user.id
      }

      // Invitation must not reassign an identity that already owns a profile.
      const { data: existingProfile, error: existingProfileError } = await supabaseAdmin.from('users').select('id').eq('id', userId).maybeSingle()
      if (existingProfileError) return new Response(JSON.stringify({ error: 'No se pudo verificar el perfil de la identidad; requiere revisión administrativa', userId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      if (existingProfile) return new Response(JSON.stringify({ error: 'La identidad ya está vinculada; no se modificó su perfil' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      rollback = async () => { const { error } = await supabaseAdmin.auth.admin.deleteUser(userId); return !error }

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(
          {
            id: userId,
            store_id: targetStoreId,
            full_name: fullName,
            email,
            role,
            is_active: true,
          }
        )
        .select()
        .single()

      if (insertError || !newProfile) {
        const cleanedUp = await rollback()
        rollback = null
        if (!cleanedUp) return new Response(JSON.stringify({ error: 'No se pudo completar ni revertir la creación del colaborador', userId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ error: insertError?.message ?? 'Perfil no creado' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      rollback = null
      return new Response(JSON.stringify({ staff: newProfile }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update-role') {
      const { userId, role } = body
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: 'Faltan campos obligatorios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const validRoles = ['owner', 'admin', 'cashier', 'stock_clerk']
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'Rol especificado no válido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!isSuperAdmin && callerProfile?.role !== 'owner') {
        if (role === 'owner' || role === 'admin') {
          return new Response(
            JSON.stringify({ error: 'Solo el propietario puede asignar roles administrativos' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role })
        .eq('id', userId)
        .eq('store_id', targetStoreId)
        .select()
        .single()

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ staff: updated }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'toggle-status') {
      const { userId, isActive } = body
      if (!userId || typeof isActive !== 'boolean') {
        return new Response(JSON.stringify({ error: 'Parámetros insuficientes' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!isSuperAdmin && userId === callerProfile?.id) {
        return new Response(
          JSON.stringify({ error: 'No es posible modificar el estado del usuario propio en sesión' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: updated, error: toggleError } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)
        .eq('store_id', targetStoreId)
        .select()
        .single()

      if (toggleError) {
        return new Response(JSON.stringify({ error: toggleError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ staff: updated }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'reset-password') {
      const { userId, newPassword } = body
      if (!userId || !newPassword || newPassword.trim().length < 6) {
        return new Response(JSON.stringify({ error: 'Contraseña requerida de al menos 6 caracteres' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!isSuperAdmin) {
        if (!callerProfile || callerProfile.role !== 'owner') {
          return new Response(JSON.stringify({ error: 'No autorizado' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data: targetUser, error: targetUserError } = await supabaseAdmin
          .from('users')
          .select('store_id')
          .eq('id', userId)
          .single()

        if (targetUserError || !targetUser || targetUser.store_id !== callerProfile.store_id) {
          return new Response(JSON.stringify({ error: 'No autorizado para este usuario' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword.trim(),
      })

      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, message: 'Contraseña restablecida con éxito' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { userId } = body
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!isSuperAdmin && callerProfile?.role !== 'owner') {
        return new Response(
          JSON.stringify({ error: 'Solo el propietario de la tienda puede desvincular definitivamente a un colaborador' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!isSuperAdmin && userId === callerProfile?.id) {
        return new Response(
          JSON.stringify({ error: 'El propietario principal no puede eliminarse a sí mismo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Auth owns the identity; deleting it cascades the verified profile.
      // If Auth refuses the deletion, leave the business profile intact.
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteAuthError) return new Response(JSON.stringify({ error: deleteAuthError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      return new Response(JSON.stringify({ success: true, deletedUserId: userId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no reconocida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (rollback) {
      try { if (!await rollback()) throw new Error('Rollback failed') } catch { return new Response(JSON.stringify({ error: 'Error al revertir la creación; requiere revisión administrativa' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
}
