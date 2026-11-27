"use client";

import * as React from "react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { recordStudyViewAction } from "@/lib/actions/profile";

interface StudyViewTrackerProps {
  studyId: string;
}

/**
 * Records a study view strictly for signed-in users who opted into
 * `viewed_studies_visibility !== "private"`. Renders nothing.
 */
export function StudyViewTracker({ studyId }: StudyViewTrackerProps) {
  const { profile, loading } = useAccountProfile();
  const recordedForStudyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (loading || !profile) return;
    if (profile.viewed_studies_visibility === "private") return;
    if (recordedForStudyRef.current === studyId) return;

    recordedForStudyRef.current = studyId;
    void recordStudyViewAction({ studyId });
  }, [profile, loading, studyId]);

  return null;
}
