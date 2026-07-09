"use client";

import { useState } from "react";

import { ConfirmDialog } from "~/app/_components/confirm-dialog";
import { useToast } from "~/app/_components/toast";
import { ChallengeCard } from "~/app/challenge/_components/challenge-card";
import { CreateChallengeModal } from "~/app/challenge/_components/create-challenge-modal";
import {
  beerDeltaClasses,
  canRespond,
  canSubmitPick,
  formatBeerDelta,
  myChallengeDelta,
} from "~/lib/challenge";
import { api, type RouterOutputs } from "~/trpc/react";

type Challenge = RouterOutputs["challenge"]["listMine"][number];

function Section({
  title,
  challenges,
  empty,
  children,
}: {
  title: string;
  challenges: Challenge[];
  empty?: string;
  children: (challenge: Challenge) => React.ReactNode;
}) {
  if (challenges.length === 0 && !empty) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h2>
      {challenges.length === 0 ? (
        <p className="text-sm text-foreground/40">{empty}</p>
      ) : (
        <div className="space-y-3">{challenges.map(children)}</div>
      )}
    </section>
  );
}

type Tab = "mine" | "community";

export function ChallengePageClient({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const { data: challenges } = api.challenge.listMine.useQuery();

  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const { data: communityChallenges } = api.challenge.listCommunity.useQuery(
    undefined,
    { enabled: activeTab === "community" },
  );

  const [showCreate, setShowCreate] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  const invalidateAll = () => {
    void utils.challenge.listMine.invalidate();
    void utils.challenge.getOpenIncomingCount.invalidate();
  };

  const respondMut = api.challenge.respond.useMutation({
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.message),
  });
  const cancelMut = api.challenge.cancel.useMutation({
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.message),
  });
  const submitPickMut = api.challenge.submitPick.useMutation({
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.message),
  });

  const list = challenges ?? [];

  const needsAttention = list.filter(
    (c) => canRespond(c, currentUserId) || canSubmitPick(c, currentUserId),
  );
  const needsAttentionIds = new Set(needsAttention.map((c) => c.id));
  const sent = list.filter(
    (c) => c.challengerId === currentUserId && c.status === "OPEN",
  );
  // ACCEPTED (waiting for the match), or REVIEW where the caller already
  // picked and is just waiting on the other side — anything actionable is
  // already pulled into needsAttention above.
  const active = list.filter(
    (c) =>
      ["ACCEPTED", "REVIEW", "CONFLICT"].includes(c.status) &&
      !needsAttentionIds.has(c.id),
  );
  const history = list.filter((c) =>
    ["REJECTED", "CANCELLED", "DONE"].includes(c.status),
  );

  const doneChallenges = list.filter((c) => c.status === "DONE");
  const myTotalDelta = doneChallenges.reduce(
    (sum, c) => sum + (myChallengeDelta(c, currentUserId) ?? 0),
    0,
  );

  function handleAccept(id: string) {
    respondMut.mutate({ id, action: "ACCEPT" });
  }

  function handleRejectConfirm() {
    if (!pendingRejectId) return;
    respondMut.mutate(
      { id: pendingRejectId, action: "REJECT" },
      { onSettled: () => setPendingRejectId(null) },
    );
  }

  function handleCancelConfirm() {
    if (!pendingCancelId) return;
    cancelMut.mutate(
      { id: pendingCancelId },
      { onSettled: () => setPendingCancelId(null) },
    );
  }

  function handleSubmitPick(id: string, pickedUserId: string) {
    submitPickMut.mutate({ id, pickedUserId });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="mb-6 cursor-pointer rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-card transition hover:bg-foreground/90"
      >
        Create challenge
      </button>

      <div className="mb-6 flex items-baseline gap-3 text-2xl font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("mine")}
          className={`cursor-pointer transition ${activeTab === "mine" ? "" : "text-foreground/30 hover:text-foreground/50"}`}
        >
          My challenges
        </button>
        <span className="text-foreground/20">|</span>
        <button
          type="button"
          onClick={() => setActiveTab("community")}
          className={`cursor-pointer transition ${activeTab === "community" ? "" : "text-foreground/30 hover:text-foreground/50"}`}
        >
          Community challenges
        </button>
      </div>

      {activeTab === "mine" && (
        <>
          {doneChallenges.length > 0 && (
            <p className="mb-6 text-sm text-foreground/60">
              Net from challenges:{" "}
              <span
                className={`font-semibold ${beerDeltaClasses(myTotalDelta)}`}
              >
                {formatBeerDelta(myTotalDelta)} beers
              </span>
            </p>
          )}

          {list.length === 0 && (
            <p className="text-sm text-foreground/40">
              No challenges yet. Create one to transfer beers with a friend.
            </p>
          )}

          <Section title="Needs your attention" challenges={needsAttention}>
            {(c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onRequestReject={setPendingRejectId}
                onRequestCancel={setPendingCancelId}
                onSubmitPick={handleSubmitPick}
                isResponding={respondMut.isPending}
                isSubmittingPick={submitPickMut.isPending}
              />
            )}
          </Section>

          <Section title="Your open challenges" challenges={sent}>
            {(c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onRequestReject={setPendingRejectId}
                onRequestCancel={setPendingCancelId}
                onSubmitPick={handleSubmitPick}
                isResponding={respondMut.isPending}
                isSubmittingPick={submitPickMut.isPending}
              />
            )}
          </Section>

          <Section title="Active" challenges={active}>
            {(c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onRequestReject={setPendingRejectId}
                onRequestCancel={setPendingCancelId}
                onSubmitPick={handleSubmitPick}
                isResponding={respondMut.isPending}
                isSubmittingPick={submitPickMut.isPending}
              />
            )}
          </Section>

          <Section title="History" challenges={history}>
            {(c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onRequestReject={setPendingRejectId}
                onRequestCancel={setPendingCancelId}
                onSubmitPick={handleSubmitPick}
                isResponding={respondMut.isPending}
                isSubmittingPick={submitPickMut.isPending}
              />
            )}
          </Section>
        </>
      )}

      {activeTab === "community" && (
        <>
          {communityChallenges?.length === 0 && (
            <p className="text-sm text-foreground/40">
              No other challenges yet.
            </p>
          )}
          <div className="space-y-3">
            {communityChallenges?.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                currentUserId={currentUserId}
                onAccept={handleAccept}
                onRequestReject={setPendingRejectId}
                onRequestCancel={setPendingCancelId}
                onSubmitPick={handleSubmitPick}
                isResponding={respondMut.isPending}
                isSubmittingPick={submitPickMut.isPending}
              />
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CreateChallengeModal onClose={() => setShowCreate(false)} />
      )}

      <ConfirmDialog
        open={!!pendingRejectId}
        title="Reject challenge?"
        description="This challenge will be marked as rejected and can't be reopened."
        onConfirm={handleRejectConfirm}
        onCancel={() => setPendingRejectId(null)}
        confirmLabel="Reject"
        dangerous
        loading={respondMut.isPending}
      />

      <ConfirmDialog
        open={!!pendingCancelId}
        title="Cancel challenge?"
        description="This challenge will be withdrawn before your opponent responds."
        onConfirm={handleCancelConfirm}
        onCancel={() => setPendingCancelId(null)}
        confirmLabel="Cancel challenge"
        dangerous
        loading={cancelMut.isPending}
      />
    </div>
  );
}
