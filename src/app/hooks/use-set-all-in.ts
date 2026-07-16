"use client";

import { api } from "~/trpc/react";
import { useToast } from "~/app/_components/toast";

type Options = Parameters<typeof api.vote.setAllIn.useMutation>[0];

export function useSetAllIn(opts: Options = {}) {
  const utils = api.useUtils();
  const toast = useToast();

  return api.vote.setAllIn.useMutation({
    ...opts,
    onError: (err, variables, onMutateResult, ctx) => {
      toast.error("Couldn't update All In");
      opts.onError?.(err, variables, onMutateResult, ctx);
    },
    onSettled: (data, err, variables, onMutateResult, ctx) => {
      void utils.vote.getStarAllotments.invalidate();
      opts.onSettled?.(data, err, variables, onMutateResult, ctx);
    },
  });
}
