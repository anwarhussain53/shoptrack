import { NextRequest, NextResponse } from "next/server";
 
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken  = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER!;
 
export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();
 
    if (!to || !message) {
      return NextResponse.json({ error: "Missing 'to' or 'message'" }, { status: 400 });
    }
 
    // Format phone: strip non-digits, add +1 if needed
    let phone = to.replace(/\D/g, "");
    if (phone.length === 10) phone = "1" + phone;
    if (!phone.startsWith("+")) phone = "+" + phone;
 
    // Send via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
 
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Failed to send SMS" }, { status: 400 });
    }
 
    return NextResponse.json({ success: true, sid: data.sid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
