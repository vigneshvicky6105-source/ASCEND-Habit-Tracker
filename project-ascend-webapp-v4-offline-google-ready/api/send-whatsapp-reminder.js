import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    lending_id,
    installment_id,
    reminder_type = "due_date",
    friend_name,
    whatsapp_number,
    emi_number,
    emi_amount,
    due_date,
    remaining_amount
  } = req.body || {};

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Supabase credentials not configured." });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  });

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return res.status(401).json({ error: "Unauthorized user session" });
  }

  const userId = user.id;

  const whatsappToken = process.env.WHATSAPP_API_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!whatsappToken || !whatsappPhoneId) {
    return res.status(200).json({
      success: false,
      configured: false,
      message: "WhatsApp Business Cloud API credentials not configured in environment variables (WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID)."
    });
  }

  const idempotencyKey = `${userId}:${installment_id || lending_id}:${reminder_type}`;

  const { data: existing } = await supabase
    .from("whatsapp_reminders")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "Sent")
    .single();

  if (existing) {
    return res.status(200).json({
      success: true,
      already_sent: true,
      message: "Reminder already sent for this installment.",
      record: existing
    });
  }

  const formattedPhone = (whatsapp_number || "").replace(/[^0-9]/g, "");

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whatsappToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: "emi_reminder",
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(friend_name || "Friend") },
                { type: "text", text: String(emi_number || "1") },
                { type: "text", text: `₹${Number(emi_amount || 0).toLocaleString('en-IN')}` },
                { type: "text", text: String(due_date || "") },
                { type: "text", text: `₹${Number(remaining_amount || 0).toLocaleString('en-IN')}` }
              ]
            }
          ]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const failReason = data?.error?.message || "WhatsApp API Error";
      await supabase.from("whatsapp_reminders").insert([{
        user_id: userId,
        lending_id,
        installment_id: installment_id || null,
        reminder_type,
        scheduled_at: new Date().toISOString(),
        sent_at: null,
        provider_message_id: "",
        status: "Failed",
        failure_reason: failReason,
        idempotency_key: idempotencyKey
      }]);

      return res.status(400).json({ success: false, configured: true, error: failReason });
    }

    const providerMessageId = data?.messages?.[0]?.id || "";
    const { data: record } = await supabase.from("whatsapp_reminders").insert([{
      user_id: userId,
      lending_id,
      installment_id: installment_id || null,
      reminder_type,
      scheduled_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
      status: "Sent",
      failure_reason: "",
      idempotency_key: idempotencyKey
    }]).select().single();

    return res.status(200).json({ success: true, configured: true, providerMessageId, record });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
