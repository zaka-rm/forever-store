import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders } from '../_shared/cors.ts'

const resendApiKey = Deno.env.get('RESEND_API_KEY')!
const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject, message })

    if (dbError) {
      console.error('Failed to insert contact message', dbError)
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Forever Living Site <onboarding@resend.dev>',
        to: notificationEmail,
        subject: subject?.trim() || `Nouveau message de ${name}`,
        html: `<p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><p>${String(message).replace(/\n/g, '<br/>')}</p>`,
        reply_to: email,
      }),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Failed to send message' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
