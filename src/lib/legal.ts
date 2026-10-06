import { COMPANY } from "./company";

export type Block = string | { list: string[] } | { table: [string, string, string][]; head: [string, string, string] };
export type Section = { h: string; body: Block[] };
export type Doc = { title: string; intro: string; sections: Section[] };

const c = COMPANY;

export const LEGAL: Record<string, Doc> = {
  terms: {
    title: "Terms of use",
    intro: `These terms are the agreement between you and ${c.name} ("Orikly", "we", "us") when you use orikly.ng and any celebration website we host for you. Please read them. By creating an account or paying for a celebration you agree to them.`,
    sections: [
      { h: "1. Who can use Orikly", body: [
        "You must be at least 18 years old and able to enter a contract under Nigerian law. If you use Orikly for a business, you confirm that you may act for that business.",
        "You sign in with your email and a one-time code. Keep your email account secure, because anyone who can read your email can sign in as you. Tell us at once if you think someone else has used your account.",
      ] },
      { h: "2. What we provide", body: [
        "Orikly turns the photos, videos, words, event details and song you give us into a celebration website on a link we host (for example yourname.orikly.ng), and into two videos.",
        { list: [
          "Your website goes live when your payment is confirmed.",
          "Your two videos are planned by an artificial intelligence (AI) system that looks at your photos and words, and are then made in your own browser. This usually takes about two minutes and needs a recent version of Chrome or Safari.",
          "Because the videos are directed by AI, results vary. You can direct and make them again a limited number of times.",
          "Guests can leave wishes on your website. A wish is shown only after you approve it.",
        ] },
        "Times are estimates, not guarantees. If we cannot deliver, the refund policy applies.",
      ] },
      { h: "3. Price and payment", body: [
        "You can build and preview a celebration for free. Publishing it and downloading videos without a watermark costs the price shown at checkout, paid once. Prices are in Naira and include any tax we are required to charge.",
        "Payments are processed by our payment partner. We do not see or store your card number. Where we offer manual bank transfer, your celebration goes live after we confirm that the money arrived.",
        "Packs: you can buy several celebrations at once at a lower price each. Each credit publishes one celebration. Credits do not expire, cannot be exchanged for cash and cannot be moved to another account.",
      ] },
      { h: "4. Your content", body: [
        "Everything you upload stays yours. You give us a non-exclusive, royalty-free licence to host, copy, resize, edit and display it, only so that we can provide the service to you. This includes sending your photos and words to our AI provider so that it can plan your videos. Our AI provider does not use them to train its models.",
        "You confirm that:",
        { list: [
          "you own what you upload, or you have permission to use it, including every photo, video and song;",
          "the people shown in your photos and videos have agreed to appear, or you are the parent or guardian of any child shown;",
          "nothing you upload is unlawful, hateful, sexually explicit, harassing, or infringes someone else's rights.",
        ] },
        "Music: you are responsible for having the right to use any song you upload. A song you upload is used only in your downloadable videos and is not played on your public website. If you share a video on a social network, that network's music rules apply to you.",
        "The wall of praise: if you switch this on for a celebration, we show its names, cover photo and link publicly on orikly.ng and may feature it on our home page. It is off unless you turn it on, and you can turn it off at any time.",
        "Apart from the wall, we do not use your photos or videos in our advertising unless you agree in writing.",
      ] },
      { h: "5. Gifts and guest wishes", body: [
        "If you choose to show bank account details on your website, they are visible to anyone with your link. Any gift a guest sends goes directly from the guest to that account. Orikly does not receive, hold or move that money and is not responsible for it.",
        "You are responsible for the wishes you approve. We may remove a wish that breaks these terms.",
      ] },
      { h: "6. Acceptable use", body: [
        "You must not use Orikly to break the law, to impersonate someone, to harass or defame anyone, to collect money dishonestly, to send spam, to upload malware, or to try to break, overload or get unauthorised access to our systems.",
        "We may suspend or remove a website or an account that breaks these terms. Where it is reasonable, we tell you first and give you a chance to fix the problem.",
      ] },
      { h: "7. Complaints about content", body: [
        `If you believe something on an Orikly website infringes your rights or shows you without your consent, email ${c.email} with the link and a description. We may take the content down while we check.`,
      ] },
      { h: "8. How long your website stays up", body: [
        "We keep your website available for as long as Orikly operates the service. If we ever plan to close the service, we will give you at least 30 days' notice by email so that you can download your videos and photos.",
        "You can delete your celebration or your account at any time by contacting us.",
      ] },
      { h: "9. Our service and our rights", body: [
        "The Orikly name, designs, templates, video styles and software belong to us. We give you a personal licence to use them through the service. Do not copy, resell or reverse engineer them.",
        "We work to keep Orikly available and secure, but we do not promise that it will never be interrupted or free of errors.",
      ] },
      { h: "10. Our liability", body: [
        "Nothing in these terms limits any right you have as a consumer under the Federal Competition and Consumer Protection Act 2018 or any liability that cannot be limited by law.",
        "Subject to that, we are not liable for indirect or consequential loss, or for loss caused by your own content, by events outside our reasonable control, or by another person's use of your link. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim.",
      ] },
      { h: "11. Changes, law and contact", body: [
        "We may update these terms. If a change matters, we will tell you by email or on the website before it takes effect. If you keep using Orikly after that, you accept the change.",
        "These terms are governed by the laws of the Federal Republic of Nigeria. We will first try to settle any dispute by talking with you. If that fails, the courts of Lagos State have jurisdiction.",
        `Contact: ${c.name}, ${c.address}. Email ${c.email}.`,
      ] },
    ],
  },

  privacy: {
    title: "Privacy notice",
    intro: `This notice explains what personal data ${c.name} ("Orikly", "we") collects, why, and what your rights are. We are the data controller. We follow the Nigeria Data Protection Act 2023 (NDPA).`,
    sections: [
      { h: "1. The data we collect", body: [
        { table: [
          ["Account", "Your email address, your name and your WhatsApp number if you give them.", "You"],
          ["Celebration content", "Photos, videos, names, dates, your story and messages, your song, venue and dress code, and bank details if you choose to show them for gifts.", "You"],
          ["Guest wishes", "The name and message a guest types on a celebration website.", "Guests"],
          ["Payments", "What you bought, the amount, the time, a payment reference, and for bank transfers the sender name you give us. We never receive your card number.", "You and our payment partner"],
          ["Usage", "Pages opened and steps completed, a random session id, the kind of device, and where you came from (for example an advert).", "Your browser"],
        ], head: ["Kind", "What it is", "From"] },
        "Photos can show other people, including children. You must have their permission, or be the parent or guardian, before you upload them.",
      ] },
      { h: "2. Why we use it and our lawful basis", body: [
        { table: [
          ["To provide the service", "Create your website and videos (including AI analysis of your photos and words to plan the videos), sign you in, take payment, send your code and service emails.", "Contract"],
          ["The wall of praise", "Show your celebration's names, cover photo and link publicly, only if you switch it on.", "Your consent"],
          ["To keep Orikly safe", "Prevent fraud and abuse, fix faults, enforce our terms.", "Legitimate interest"],
          ["To improve Orikly", "Count how features are used. On celebration websites we only count views, with no names and no advertising trackers.", "Legitimate interest"],
          ["Analytics and advertising cookies", "Measure visits and our adverts through Google, Meta and TikTok.", "Your consent"],
          ["To meet legal duties", "Keep tax and accounting records, answer lawful requests.", "Legal obligation"],
        ], head: ["Purpose", "What we do", "Basis"] },
        "We do not sell your personal data. AI is used only to plan the look of your videos. We do not make decisions about you by automated means that have a legal effect on you.",
      ] },
      { h: "3. Who we share it with", body: [
        "We share data only with those who help us run Orikly, under contracts that require them to protect it:",
        { list: [
          "Convex: our database, file storage and application backend.",
          "Vercel: hosts the website.",
          "Hostinger: our domain name and DNS provider.",
          "Anthropic: the AI provider that looks at your photos and words to plan your videos. It processes them for us and does not use them to train its models.",
          "Resend: sends sign-in codes and service emails.",
          "Bachs: processes payments.",
          "Google, Meta and TikTok, only if you accept analytics or marketing cookies.",
          "Regulators, courts or law enforcement where the law requires it.",
        ] },
        "Your celebration website is visible to anyone who has your link. We ask search engines not to list it. If you switch on the wall of praise, its names, cover photo and link are public.",
      ] },
      { h: "4. Transfers outside Nigeria", body: [
        "Some of our providers store data outside Nigeria, including in the United States and the European Union. When we transfer personal data abroad we rely on the grounds the NDPA allows, such as contractual safeguards with the provider or your consent, and we check that the provider protects the data properly.",
      ] },
      { h: "5. How long we keep it", body: [
        { list: [
          "Your account and celebration content: until you delete it or ask us to, or until the service ends.",
          "Payment and payout records: for as long as tax and accounting law requires.",
          "Usage data: up to 24 months, then deleted or made anonymous.",
          "Sign-in codes: 10 minutes.",
          "Your cookie choice: 6 months, then we ask again.",
        ] },
      ] },
      { h: "6. Your rights", body: [
        "Under the NDPA you can:",
        { list: [
          "ask for a copy of your personal data;",
          "ask us to correct it;",
          "ask us to delete it;",
          "ask us to restrict or stop using it, or object to how we use it;",
          "ask for it in a format you can take elsewhere;",
          "withdraw your consent at any time, for example through Cookie settings at the bottom of any page;",
          "complain to the Nigeria Data Protection Commission (ndpc.gov.ng).",
        ] },
        `To use any of these rights, email ${c.email} from the address on your account. We answer within 30 days. We may ask you to confirm who you are.`,
      ] },
      { h: "7. Security", body: [
        "Data is encrypted in transit. Access to customer content is limited to the people who need it. Sign-in uses one-time codes, so we hold no passwords. No system is perfectly secure. If a breach is likely to put your rights at risk, we will tell you and the Commission as the law requires.",
      ] },
      { h: "8. Children", body: [
        "Orikly is for adults. We do not knowingly create accounts for anyone under 18. If you believe a child has given us personal data, contact us and we will delete it.",
      ] },
      { h: "9. Changes and contact", body: [
        "We will post any change to this notice here and, if it matters, tell you by email.",
        `Data controller: ${c.name}, ${c.address}. Privacy contact: ${c.email}.`,
      ] },
    ],
  },

  cookies: {
    title: "Cookie policy",
    intro: "Cookies are small files a website keeps in your browser. We also use your browser's local storage in the same way. This page lists what we use and how to change your choice.",
    sections: [
      { h: "What we use", body: [
        { table: [
          ["Necessary", "Sign-in cookies that keep you logged in. A record of your cookie choice (orikly_consent, 6 months). A random session id and where you came from (cleared when you close the tab).", "Always on"],
          ["Analytics", "Google Analytics (_ga and related cookies, up to 2 years) to count visits and see which pages work.", "Only if you agree"],
          ["Marketing", "Meta Pixel (_fbp, about 3 months) and TikTok Pixel (_ttp, about 13 months) to measure our adverts and show you relevant ones.", "Only if you agree"],
        ], head: ["Kind", "What and how long", "When"] },
        "Analytics and marketing tags are not loaded at all until you agree. Celebration websites (the pages your guests see) never carry advertising trackers.",
      ] },
      { h: "Changing your choice", body: [
        "Use Cookie settings at the bottom of any page to change or withdraw your choice at any time. You can also clear cookies in your browser settings. We ask again every 6 months.",
      ] },
      { h: "Contact", body: [`Questions: ${c.email}.`] },
    ],
  },

  refunds: {
    title: "Refund policy",
    intro: "You build and preview your celebration for free, so you see what you are buying before you pay. This policy covers what happens after payment.",
    sections: [
      { h: "When we refund you in full", body: [
        { list: [
          "You paid, and your website or your videos do not work, and we cannot fix the problem within 48 hours of you telling us.",
          "You were charged twice for the same celebration.",
          "We remove your celebration for a reason that is not your fault.",
        ] },
      ] },
      { h: "When we do not refund", body: [
        { list: [
          "After your website is live and your videos are available to download, because the service has been delivered.",
          "When a website is removed because it breaks our terms.",
          "For a pack credit that has already been used to publish a celebration.",
        ] },
      ] },
      { h: "How to ask", body: [
        `Email ${c.email} from the address on your account with the name of your celebration and what went wrong. We reply within 2 working days. Approved refunds go back to the original payment method. Your bank may take up to 10 working days to show it.`,
        "This policy does not limit your rights under the Federal Competition and Consumer Protection Act 2018.",
      ] },
    ],
  },
};
