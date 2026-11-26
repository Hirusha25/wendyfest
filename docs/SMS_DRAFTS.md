# Wendy Fest text messages (drafts, sender name WENDYS)

Status: drafts for the owner and client to approve. Sent through TextWare once its login is set on the server.
Example guest: Nimal. Example codes are made up; the real coupon codes have not arrived yet.

## 1. Sign-up code (OTP), sent when a guest registers
> 4821 is your Wendy Fest code. It expires in 2 minutes. Never share it.

70 characters, 1 SMS. Already in the app.

## 2. Welcome, sent after the code is confirmed
> Hi Nimal, welcome to Wendy Fest! Your code is AB12CD. Show it at the Scream & Win or Roast Me kiosk. Your profile: https://wendyfest.martech.live/p/...

About 158 characters, 1 SMS (right at the limit; a long name tips it into 2). Already in the app.

## 3a. Scream & Win winner, FREE meal (new draft, not in the app yet)
> Nimal, you screamed it right! You won a FREE Spicy Chicken Burger Meal at Wendy's. Coupon code: WFREE-7K2M9Q. Show this SMS at the counter. T&C apply.

About 150 characters, 1 SMS.

## 3b. Scream & Win winner, 50% off (new draft, not in the app yet)
> Nimal, you screamed it right! You won 50% OFF a Spicy Chicken Burger Meal at Wendy's. Coupon code: WHALF-4T8X2B. Show this SMS at the counter. T&C apply.

About 153 characters, 1 SMS.

## 4. Scream & Win, did not win
> Nimal, close one! Not quite loud enough this time. Your profile: https://wendyfest.martech.live/p/...

About 108 characters, 1 SMS. Already in the app.

## 5. Roast Me
> Nimal, you've been roasted by Wendy's. See it, save it, share it: https://wendyfest.martech.live/r/...

About 109 characters, 1 SMS. Already in the app.

## Notes
- Sinhala and Tamil versions of 1, 2, 4 and 5 exist in `server/sms.js`. They were written by an AI and need a native speaker's check. They cost 2 to 3 SMS each, because Sinhala and Tamil letters fit only 70 to a message.
- 3a and 3b are English only so far. Sinhala and Tamil versions are to be written once the English is approved.
- To confirm with the client: where and until when the coupon can be used, and whether "Show this SMS at the counter" is how staff will redeem it.
