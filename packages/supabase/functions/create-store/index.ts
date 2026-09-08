import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    
    // Verificar que quien llama es super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdminCheck = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: callerData, error: callerError } = await supabaseAdminCheck.auth.getUser(token)

    if (callerError || !callerData.user?.app_metadata?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { email, storeName, fullName, planCode, subscriptionStatus, billingCycle } =
      await req.json()

    if (!email || !storeName || !fullName || !planCode || !subscriptionStatus) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['trialing', 'active'].includes(subscriptionStatus)) {
      return new Response(
        JSON.stringify({ error: 'subscriptionStatus debe ser "trialing" o "active"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Cliente con permisos de administrador (service_role) — nunca se expone al navegador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Buscar el id del plan a partir de su código
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('code', planCode)
      .single()

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: `Plan "${planCode}" no encontrado` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. Invitar al usuario por correo (crea la cuenta y le manda el link de invitación)
    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (inviteError || !invited.user) {
      return new Response(
        JSON.stringify({ error: inviteError?.message ?? 'No se pudo invitar al usuario' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userId = invited.user.id

    // 3. Crear la tienda
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .insert({
        name: storeName,
        owner_id: userId,
        plan_id: plan.id,
        subscription_status: subscriptionStatus,
        billing_cycle: billingCycle ?? null,
      })
      .select()
      .single()

    if (storeError) {
      return new Response(
        JSON.stringify({ error: storeError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Crear el perfil del usuario, vinculado a la tienda
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: userId,
      store_id: store.id,
      full_name: fullName,
      role: 'owner',
    })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ user: invited.user, store }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error inesperado' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})