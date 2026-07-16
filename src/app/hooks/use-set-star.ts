"use client";

import { api } from "~/trpc/react";
import { useToast } from "~/app/_components/toast";

type Options = Parameters<typeof api.vote.setStar.useMutation>[0];

export function useSetStar(opts: Options = {}) {
  const utils = api.useUtils();
  const toast = useToast();

  return api.vote.setStar.useMutation({
    ...opts,
    onError: (err, variables, onMutateResult, ctx) => {
      toast.error("Couldn't update star");
      opts.onError?.(err, variables, onMutateResult, ctx);
    },
    onSettled: (data, err, variables, onMutateResult, ctx) => {
      void utils.vote.getStarAllotments.invalidate();
      opts.onSettled?.(data, err, variables, onMutateResult, ctx);
    },
  });
}
