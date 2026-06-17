// app/waiver/[type]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import CloseTabButton from "@/components/ui/CloseTabButton";

type WaiverType = "signup" | "event-creation" | "bout-acceptance";

type WaiverSection = {
  heading: string;
  content: string;
};

type WaiverData = {
  title: string;
  subtitle: string;
  version: string;
  intro: string;
  sections: WaiverSection[];
};

const WAIVERS: Record<WaiverType, WaiverData> = {
  signup: {
    title: "Platform Participation Agreement",
    subtitle: "Sign-Up Waiver & Disclaimer",
    version: "Version 1.0",
    intro:
      "Please read this agreement carefully before creating an account. By checking the acknowledgement box during sign-up, you confirm that you have read, understood, and agree to be bound by the terms below.",
    sections: [
      {
        heading: "1. Age & Eligibility",
        content: `By creating an account on this platform, you confirm that you are at least 18 years of age. If you are between 16 and 18 years of age, you confirm that you have obtained the express written consent of a parent or legal guardian prior to registering.

The platform takes no responsibility whatsoever for any user who misrepresents their age. If it is discovered that a user has provided false age information, the platform reserves the right to suspend or permanently delete that account without notice. The user accepts sole liability for any consequences — legal, medical, competitive, financial, or otherwise — that arise as a direct or indirect result of that misrepresentation. The platform will cooperate fully with any relevant legal authorities in such cases.`,
      },
      {
        heading: "2. Accuracy of Information",
        content: `You certify that all information you provide when creating and maintaining your profile — including but not limited to your full legal name, date of birth, body weight, height, weight class, fight record, experience level, gym affiliation, coaching credentials, and any other competitive or professional statistics — is truthful, accurate, and kept up to date.

You accept full and sole responsibility for any harm, dispute, competitive mismatch, financial loss, or legal consequence that arises from the provision of false, inaccurate, or misleading profile information. The platform does not independently verify the accuracy of user-submitted data and bears no liability for any decision made by any third party in reliance on such information.

You agree to update your profile promptly should any material information change.`,
      },
      {
        heading: "3. Medical Fitness & Physical Condition",
        content: `By creating an account, you confirm that you are medically fit and physically capable of participating in combat sports activities. The platform does not assess, screen, verify, or take any responsibility for your physical health, mental health, or medical condition.

You agree to consult a qualified medical professional before engaging in any training, sparring, or competitive bouts arranged through or facilitated by this platform. You accept full responsibility for your own health and physical welfare throughout all activities connected to your use of this platform.

The platform bears no liability for any injury, illness, aggravation of a pre-existing condition, or medical emergency that arises in connection with your participation in any activity facilitated by this platform.`,
      },
      {
        heading: "4. Platform Role & Limitation of Liability",
        content: `This platform operates solely as an online marketplace and digital directory that facilitates connections between fighters, coaches, gyms, and promotions. The platform is not a promoter, sanctioning body, trainer, matchmaker, or athletic commission. It does not organise, supervise, or oversee any fight, event, or training activity.

The platform expressly disclaims all liability for:
• Any injury, serious injury, death, or property damage arising from any combat sports activity arranged through or facilitated by this platform;
• The quality, suitability, or safety of any match-up between athletes;
• The professional conduct, competence, or credentials of any gym, coach, promoter, or other user;
• Any financial disputes between users of the platform;
• Any failure by an event organiser to obtain necessary licences, permits, insurance, or medical provisions;
• Any loss or damage arising from reliance on user-submitted content or statistics.`,
      },
      {
        heading: "5. User-Generated Content",
        content: `You accept full responsibility for all content you upload, post, or submit to this platform, including fight records, media files, profile photographs, videos, and comments. You confirm that you own or have the legal right to use any content you submit, and that such content does not infringe any third-party intellectual property rights, privacy rights, or applicable laws.

The platform reserves the right to remove any content that, in its sole discretion, violates these terms or is otherwise inappropriate, without prior notice and without liability to you.`,
      },
      {
        heading: "6. Indemnification",
        content: `You agree to indemnify, defend, and hold harmless the platform, its owners, directors, officers, employees, contractors, and agents from and against any and all third-party claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising from or related to:
• Your use of the platform;
• Your violation of any term of this agreement;
• Any information you submit to the platform;
• Any activity you engage in through or in connection with this platform;
• Any misrepresentation you make regarding your age, identity, qualifications, or physical condition.`,
      },
      {
        heading: "7. No Warranty",
        content: `The platform is provided on an "as is" and "as available" basis without any warranty of any kind, express or implied. The platform does not warrant that the service will be uninterrupted, error-free, or free from harmful components.`,
      },
      {
        heading: "8. Amendments",
        content: `The platform reserves the right to update or amend this agreement at any time. Users will be notified of material changes and will be required to re-accept the updated agreement. Continued use of the platform following notification of any changes constitutes your acceptance of the updated terms.`,
      },
    ],
  },

  "event-creation": {
    title: "Event Organiser Liability Waiver",
    subtitle: "Event Creation Disclaimer",
    version: "Version 1.0",
    intro:
      "Please read this waiver carefully before publishing an event. By checking the acknowledgement box, you confirm that you have read, understood, and agree to the terms below as the legally responsible organiser of this event.",
    sections: [
      {
        heading: "1. Organiser Responsibility",
        content: `By creating an event on this platform, you ("the Organiser") confirm that you are the legally responsible party for all aspects of the event. This includes, without limitation, all logistical, safety, financial, regulatory, contractual, and medical matters relating to the event.

The platform provides a digital tool for creating and promoting events only. It bears no responsibility whatsoever for the planning, organisation, conduct, or outcomes of any event created through it. The platform is not a co-organiser, co-promoter, or party to any agreement between the Organiser and any fighter, official, or attendee.`,
      },
      {
        heading: "2. Injury, Death & Incidents",
        content: `The Organiser accepts full and sole liability for any injury, serious injury, death, property damage, emotional distress, or any other incident or harm that occurs at, during, in preparation for, or in connection with the event — whether involving fighters, coaches, corner staff, officials, staff members, volunteers, or spectators.

The platform expressly disclaims all liability for any such incident. The Organiser agrees to indemnify and hold harmless the platform, its owners, directors, employees, and agents from any claim, legal action, fine, penalty, or liability arising from any such incident.`,
      },
      {
        heading: "3. Medical & Safety Provisions",
        content: `The Organiser confirms that they will ensure all required and appropriate medical and safety provisions are in place at the event venue prior to and throughout the event. These provisions include, but are not limited to:
• A qualified ringside physician present for all bouts;
• Trained paramedics or certified first-aiders;
• Appropriate emergency medical equipment;
• A clear emergency response and evacuation plan communicated to all staff.

The platform makes no representations as to what constitutes adequate medical provision for any given event, and accepts no liability for any injury or harm resulting from inadequate safety or medical arrangements.`,
      },
      {
        heading: "4. Regulatory & Legal Compliance",
        content: `The Organiser is solely responsible for ensuring that the event complies with all applicable laws, regulations, and requirements in the jurisdiction in which the event takes place. This includes, but is not limited to:
• All national, regional, and local sporting regulations;
• Licences and permits required by any relevant athletic commission, governing body, or local authority;
• All applicable insurance requirements, including public liability insurance;
• Venue licensing and health & safety regulations;
• Fighter licensing and medical certification requirements.

The platform does not provide legal, regulatory, or insurance advice and accepts no liability for non-compliance by the Organiser with any applicable laws or regulations.`,
      },
      {
        heading: "5. Fighter & Participant Agreements",
        content: `All contracts, agreements, bout agreements, and financial arrangements between the Organiser and any fighters, coaches, corner staff, officials, or other participants are solely between those parties. The platform is not a party to any such agreement and accepts no liability arising from any dispute, breach, or failure to perform under any such agreements.

The Organiser confirms that they will obtain appropriate consent and, where applicable, contractual agreements from all participants prior to the event.`,
      },
      {
        heading: "6. No-Shows, Disputes & Purse Issues",
        content: `The platform accepts no liability for any fighter cancellation, no-show, late withdrawal, failure to make weight, weight-miss dispute, bout cancellation, purse dispute, disagreement over bout conditions, or any other dispute between the Organiser and any participant or third party. All such matters are entirely the responsibility of the Organiser to resolve.`,
      },
      {
        heading: "7. Streaming & Broadcast Rights",
        content: `If the event is streamed or broadcast through this platform, the Organiser warrants and confirms that they hold all necessary rights to broadcast the event, including the rights to broadcast the appearances, performances, and likenesses of all fighters, officials, and other persons who appear. The Organiser accepts full liability for any intellectual property, broadcast rights, image rights, or data protection claim arising from the streaming of the event, and agrees to indemnify the platform against any such claim.`,
      },
      {
        heading: "8. Indemnification",
        content: `The Organiser agrees to indemnify, defend, and hold harmless the platform, its owners, directors, officers, employees, and agents from and against any and all claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising from the event or any activity connected to it, including any claim brought by a fighter, official, spectator, or any other third party.`,
      },
      {
        heading: "9. Amendments",
        content: `The platform reserves the right to update or amend this waiver at any time. Organisers will be required to re-accept the current version of the waiver when creating any new event following a material update.`,
      },
    ],
  },

  "bout-acceptance": {
    title: "Bout Acceptance Agreement",
    subtitle: "Bout Confirmation Disclaimer",
    version: "Version 1.0",
    intro:
      "Please read this agreement carefully before accepting a bout offer. By checking the acknowledgement box, you confirm that you have read, understood, and agree to the terms below.",
    sections: [
      {
        heading: "1. Voluntary Acceptance",
        content: `By accepting a bout offer on this platform, you ("the Organiser") confirm that you are voluntarily and knowingly confirming this match-up. You confirm that you have reviewed all available information about both fighters, including their visible record, stated weight class, stated experience level, and any other details provided on the platform.

You acknowledge that the platform does not independently verify the accuracy of fighter-submitted data and makes no representations as to the suitability, fairness, or safety of any match-up. The sole responsibility for evaluating the suitability of a bout rests with you.`,
      },
      {
        heading: "2. Platform Not a Matchmaker",
        content: `The platform provides a digital tool for facilitating connections between event organisers and fighters. It does not function as a matchmaker, sanctioning body, athletic commission, or sporting regulator, and does not independently assess the physical condition, medical fitness, competitive suitability, or licensing status of any fighter.

The platform expressly disclaims all liability for any injury, harm, competitive mismatch, or dispute arising from a bout confirmed through this platform.`,
      },
      {
        heading: "3. Fighter Eligibility & Physical Condition",
        content: `By accepting a bout, the Organiser confirms that, to the best of their knowledge:
• Both fighters are eligible to compete under the applicable rules and any relevant licensing requirements;
• Both fighters will be required to be medically cleared and fit to compete before the bout takes place;
• The agreed weight class is appropriate and achievable for both fighters;
• Any specific bout conditions (rules, rounds, equipment) have been or will be agreed with both parties directly.

The platform accepts no liability for any failure to verify fighter eligibility, licensing, or physical condition.`,
      },
      {
        heading: "4. Weight, Rules & Conduct",
        content: `The Organiser accepts full responsibility for ensuring that both fighters comply with the agreed weight class, rules, and any applicable sporting regulations at the time of the bout. Any dispute arising from a weight miss, failure to make weight, rules violation, or unsportsmanlike conduct is solely between the Organiser and the relevant parties. The platform accepts no liability in connection with any such dispute.`,
      },
      {
        heading: "5. Inherent Risk & Injury",
        content: `Combat sports carry an inherent and significant risk of injury, including serious injury or death. By confirming a bout through this platform, the Organiser acknowledges this risk and accepts full responsibility for the safety and welfare of all fighters involved in any bout they organise or facilitate.

The Organiser confirms that appropriate medical and safety provisions will be in place at the time of the bout.

The platform expressly disclaims all liability for any injury, serious injury, or death that occurs during, in preparation for, or in connection with any bout confirmed through this platform.`,
      },
      {
        heading: "6. Financial Matters",
        content: `All financial arrangements — including fighter purses, expenses, platform fees, and any other payments — are as agreed between the parties at the time of accepting the offer. The platform accepts no liability for any financial dispute arising from a bout, event, or the acceptance of any offer.`,
      },
      {
        heading: "7. Indemnification",
        content: `The Organiser agrees to indemnify, defend, and hold harmless the platform, its owners, directors, officers, employees, and agents from and against any and all claims, losses, damages, liabilities, costs, and expenses (including reasonable legal fees) arising from any bout confirmed or facilitated through this platform, including any claim brought by either fighter, any official, or any other third party.`,
      },
      {
        heading: "8. Amendments",
        content: `The platform reserves the right to update or amend this agreement at any time. Users will be required to re-accept the current version when accepting any bout following a material update.`,
      },
    ],
  },
};

const VALID_TYPES: WaiverType[] = ["signup", "event-creation", "bout-acceptance"];

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

export default function WaiverPage({ params }: { params: { type: string } }) {
  if (!VALID_TYPES.includes(params.type as WaiverType)) {
    notFound();
  }

  const waiver = WAIVERS[params.type as WaiverType];
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back link */}
      <div className="mb-6">
        <CloseTabButton />
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 mb-8">
        <p className="text-xs text-amber-700 font-medium uppercase tracking-wider mb-2">
          Legal Document
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{waiver.title}</h1>
        <p className="text-sm text-slate-500">{waiver.subtitle}</p>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
          <span>{waiver.version}</span>
          <span>·</span>
          <span>Last reviewed: {today}</span>
        </div>
      </div>

      {/* Intro */}
      <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
        <p className="text-sm text-amber-900 leading-relaxed">{waiver.intro}</p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {waiver.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              {section.heading}
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 space-y-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          This document forms part of the platform&apos;s Terms of Service. By checking
          the acknowledgement box in the relevant form, you confirm that you have
          read and understood all of the above and agree to be bound by these
          terms. If you do not agree, you must not proceed.
        </p>
        <div className="flex gap-4 text-xs text-slate-400">
          <Link href="/terms" className="hover:text-purple-600 hover:underline">
            Full Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-purple-600 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
