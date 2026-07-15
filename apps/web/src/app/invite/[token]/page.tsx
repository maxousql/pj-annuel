import type { Metadata } from "next";

import { InvitationAcceptance } from "@/components/invitations/invitation-acceptance";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  return <InvitationAcceptance token={token} />;
}
