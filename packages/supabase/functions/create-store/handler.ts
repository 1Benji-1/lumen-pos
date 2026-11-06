const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const familyCategories: Record<string, readonly string[]> = {
  retail: ['comercio_general', 'minimarket_abarrotes', 'ropa_calzado', 'ferreteria_construccion', 'farmacia_belleza', 'libreria_papeleria', 'tecnologia_celulares', 'repuestos', 'tienda_mascotas'],
  gastronomy: ['restaurante_tradicional', 'cafeteria', 'bar', 'panaderia', 'comida_rapida', 'dark_kitchen'],
  services: ['barberia_belleza', 'lavanderia', 'taller', 'servicio_tecnico'],
  wholesale: ['mayorista_general', 'distribuidor'],
}

function getInitialSubscriptionEnd(billingCycle: string): string {
  const start = new Date()
  const end = new Date(start)
  const months = billingCycle === 'annual' ? 12 : billingCycle === 'semiannual' ? 6 : 1
  // PostgreSQL calendar intervals clamp the day at the end of the target
  // month. Set day 1 before changing months to avoid JavaScript overflow.
  end.setUTCDate(1)
  end.setUTCMonth(end.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
  end.setUTCDate(Math.min(start.getUTCDate(), lastDay))
  return end.toISOString()
}

export function createHandler(createClient: (...args: any[]) => any, env: (name: string) => string | undefined) {
return async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  let rollback: (() => Promise<boolean>) | null = null
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdminCheck = createClient(
      env('SUPABASE_URL')!,
      env('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: callerData, error: callerError } = await supabaseAdminCheck.auth.getUser(token)

    if (callerError || callerData.user?.app_metadata?.is_super_admin !== true) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let tokenAal = 'aal1'
    try {
      const jwtPayload = JSON.parse(atob(token.split('.')[1]))
      tokenAal = jwtPayload.aal || 'aal1'
    } catch {
      tokenAal = 'aal1'
    }

    const verifiedMfaFactors = (callerData.user.factors || []).filter(
      (f: any) => f.status === 'verified'
    )
    if (verifiedMfaFactors.length > 0 && tokenAal !== 'aal2') {
      return new Response(
        JSON.stringify({ error: 'Se requiere verificación en dos pasos (AAL2) para ejecutar esta acción' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'JSON no válido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return new Response(JSON.stringify({ error: 'Solicitud no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const {
      email,
      storeName,
      fullName,
      planCode,
      subscriptionStatus,
      billingCycle,
      businessType,
      industrySubType,
      familyId,
      categoryId,
    } = body

    if ([email, storeName, fullName, planCode, subscriptionStatus].some(value => typeof value !== 'string' || !value.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (billingCycle != null && !['monthly', 'semiannual', 'annual'].includes(billingCycle)) return new Response(JSON.stringify({ error: 'Ciclo de facturación no válido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if ((familyId != null || categoryId != null) &&
      (typeof familyId !== 'string' || typeof categoryId !== 'string' || !familyCategories[familyId]?.includes(categoryId))) {
      return new Response(JSON.stringify({ error: 'Familia o categoría comercial no válida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const validBusinessTypes = ['tienda_articulos', 'restaurante', 'supermercado']
    const assignedBusinessType = categoryId
      ? familyId === 'gastronomy' ? 'restaurante' : 'tienda_articulos'
      : businessType ?? 'tienda_articulos'
    if (!validBusinessTypes.includes(assignedBusinessType)) {
      return new Response(
        JSON.stringify({
          error: 'businessType no válido. Debe ser "tienda_articulos", "restaurante" o "supermercado"',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validIndustrySubTypes = [
      'comercio_general',
      'minimarket_abarrotes',
      'ropa_calzado',
      'ferreteria_construccion',
      'farmacia_belleza',
      'libreria_papeleria',
      'tecnologia_celulares',
    ]
    if (industrySubType != null && !validIndustrySubTypes.includes(industrySubType)) return new Response(JSON.stringify({ error: 'Subtipo de comercio no válido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const assignedIndustrySubType =
      categoryId && validIndustrySubTypes.includes(categoryId) ? categoryId
      : !categoryId && industrySubType && validIndustrySubTypes.includes(industrySubType)
        ? industrySubType
        : 'comercio_general'

    if (!['trialing', 'active'].includes(subscriptionStatus)) {
      return new Response(
        JSON.stringify({ error: 'subscriptionStatus debe ser "trialing" o "active"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      env('SUPABASE_URL')!,
      env('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('code', planCode)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: `Plan "${planCode}" no encontrado` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (inviteError || !invited.user) {
      return new Response(
        JSON.stringify({ error: inviteError?.message ?? 'No se pudo invitar al usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = invited.user.id
    // Invitation must not reassign an identity that already owns a profile.
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin.from('users').select('id').eq('id', userId).maybeSingle()
    if (existingProfileError) return new Response(JSON.stringify({ error: 'No se pudo verificar el perfil de la identidad; requiere revisión administrativa', userId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (existingProfile) return new Response(JSON.stringify({ error: 'La identidad ya está vinculada; no se modificó su perfil' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    let createdStoreId: string | null = null
    rollback = async () => {
      // Store first: do not leave a store whose owner Auth identity was removed.
      if (createdStoreId) {
        const { error } = await supabaseAdmin.from('stores').delete().eq('id', createdStoreId)
        if (error) return false
      }
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      return !error
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName,
        owner_id: userId,
        plan_id: plan.id,
        subscription_status: subscriptionStatus,
        billing_cycle: billingCycle ?? (subscriptionStatus === 'active' ? 'monthly' : null),
        ...(subscriptionStatus === 'active' ? { subscription_ends_at: getInitialSubscriptionEnd(billingCycle ?? 'monthly') } : {}),
        business_type: assignedBusinessType,
        industry_sub_type: assignedIndustrySubType,
      })
      .select()
      .single()

    if (storeError || !store) {
      if (!await rollback()) return new Response(JSON.stringify({ error: 'No se pudo revertir la creación de la tienda', userId }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      rollback = null
      return new Response(
        JSON.stringify({ error: storeError?.message ?? 'Tienda no creada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    createdStoreId = store.id

    if (categoryId) {
      const { data: primaryBranch, error: branchError } = await supabaseAdmin
        .from('branches')
        .update({ category_id: categoryId })
        .eq('store_id', store.id)
        .eq('is_primary', true)
        .select('id')
        .single()
      if (branchError || !primaryBranch) {
        if (!await rollback()) return new Response(JSON.stringify({ error: 'No se pudo revertir la categoría de la tienda', userId, storeId: store.id }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        rollback = null
        return new Response(JSON.stringify({ error: branchError?.message ?? 'No se pudo asignar la categoría' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: userId,
      store_id: store.id,
      full_name: fullName,
      email: email.trim().toLowerCase(),
      role: 'owner',
    })

    if (profileError) {
      if (!await rollback()) return new Response(JSON.stringify({ error: 'No se pudo revertir la creación del perfil', userId, storeId: store.id }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      rollback = null
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    rollback = null
    return new Response(JSON.stringify({ user: invited.user, store }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (rollback) {
      try { if (!await rollback()) throw new Error('Rollback failed') } catch { return new Response(JSON.stringify({ error: 'Error al revertir la creación; requiere revisión administrativa' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
}
