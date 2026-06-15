export type LocaleCode = "ko" | "en" | "ja";

export type AppLocale = {
  common: {
    appName: string;
    activeCompanion: string;
    loading: string;
    empty: string;
  };
  controlCenter: {
    tabs: {
      character: string;
      settings: string;
      perception: string;
      report: string;
    };
    sections: {
      character: string;
      currentMode: string;
    };
  };
  settings: {
    eyebrow: string;
    title: string;
    description: string;
    sections: {
      conversation: string;
      model: string;
      language: string;
    };
    locale: {
      label: string;
      subtitle: string;
      options: Record<LocaleCode, string>;
    };
    talkFrequency: {
      label: string;
      subtitle: string;
      options: Record<"quiet" | "balanced" | "active", string>;
    };
    nickname: {
      label: string;
      subtitle: string;
      inputLabel: string;
    };
    nightCare: {
      label: string;
      subtitle: string;
      switchLabel: string;
    };
    modelRoute: {
      label: string;
      subtitle: string;
      options: Record<"api-first" | "local-first" | "template", string>;
    };
    localFallback: {
      label: string;
      subtitle: string;
      switchLabel: string;
    };
    localModelPath: {
      label: string;
      subtitle: string;
      inputLabel: string;
    };
    llamaBinaryPath: {
      label: string;
      subtitle: string;
      inputLabel: string;
    };
    llamaServer: {
      label: string;
      subtitle: string;
      hostLabel: string;
      portLabel: string;
    };
    sidecarStatus: {
      label: string;
      running: string;
      configured: string;
      unconfigured: string;
      checking: string;
    };
  };
  character: {
    eyebrow: string;
    title: string;
    description: string;
    section: string;
    currentMode: string;
    currentModeTemplate: string;
    profiles: Record<
      "ruda" | "emilia" | "daon",
      { name: string; description: string }
    >;
  };
  perception: {
    eyebrow: string;
    title: string;
    description: string;
    sections: {
      capture: string;
      liveContext: string;
    };
    analysis: {
      label: string;
      subtitle: string;
      switchLabel: string;
    };
    proactiveTrigger: {
      label: string;
      subtitle: string;
      switchLabel: string;
    };
    privacyFilter: {
      label: string;
      subtitle: string;
      switchLabel: string;
    };
    liveContext: {
      activeApp: string;
      windowTitle: string;
      stateSync: string;
      category: string;
    };
    privacyCard: {
      title: string;
      description: string;
      active: string;
      inactive: string;
      blocked: string;
      screenPermission: string;
      permissionGranted: string;
      permissionNeeded: string;
      sensitiveState: string;
      passed: string;
      reasons: Record<
        | "password_manager"
        | "finance"
        | "messaging"
        | "email"
        | "government"
        | "authentication"
        | "custom_keyword",
        string
      >;
    };
    status: {
      sensitiveBlocked: string;
      analysisWaiting: string;
      analysisPaused: string;
    };
  };
  report: {
    eyebrow: string;
    title: string;
    description: string;
    sections: {
      summary: string;
      timeline: string;
    };
    metrics: {
      focusTime: string;
      utterances: string;
    };
    timeline: {
      loading: string;
      empty: string;
    };
    fallback: {
      focusTimeValue: string;
      utterancesValue: string;
    };
  };
  companion: {
    presence: {
      open: string;
      wake: string;
      newMessage: string;
    };
    status: {
      quiet: string;
      pocket: string;
      deep: string;
      dailyCare: string;
      sleep: string;
    };
    nudge: {
      close: string;
      ignore: string;
    };
    chat: {
      close: string;
      send: string;
      waiting: string;
      placeholder: string;
      placeholderDeep: string;
      dailyCareLink: string;
    };
    dailyCare: {
      subtitle: string;
      title: string;
      close: string;
      intro: string;
      togetherTime: string;
      togetherTimeValue: string;
      noteCount: string;
      noteCountValue: string;
      keywords: string;
      keywordValue: string;
      closing: string;
      closingMessage: string;
    };
    dev: {
      persona: string;
      timeline: string;
      timelineEmpty: string;
    };
  };
  persona: {
    warm_friend: {
      name: string;
      shortLabel: string;
      description: string;
    };
    fantasy_guardian: {
      name: string;
      shortLabel: string;
      description: string;
    };
  };
};

/** @deprecated Use AppLocale["companion"] */
export type CompanionLocale = AppLocale["companion"];
