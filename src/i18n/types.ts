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
    advanced: {
      toggle: string;
      hint: string;
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
    modelPreset: {
      label: string;
      subtitle: string;
      recommended: string;
    };
    llmHealth: {
      label: string;
      checking: string;
      available: string;
      unavailable: string;
    };
    testUtterance: {
      label: string;
      subtitle: string;
      button: string;
      running: string;
    };
    appearance: {
      label: string;
      subtitle: string;
      options: Record<"dark" | "light" | "system", string>;
    };
    accentColor: {
      label: string;
      subtitle: string;
      options: Record<
        "rose" | "lavender" | "sky" | "mint" | "peach",
        string
      >;
    };
    companionPersona: {
      label: string;
      subtitle: string;
      icons: Record<"bubble" | "letter" | "star" | "orb", string>;
    };
  };
  llm: {
    template: {
      chatEmpty: string;
      chatReply: string;
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
      basics: string;
      details: string;
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
    privacyKeywords: {
      label: string;
      subtitle: string;
      inputLabel: string;
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
      analysisLoading: string;
      analysisError: string;
    };
    advanced: {
      toggle: string;
      hint: string;
    };
    contextLabels: {
      idleActive: string;
      idlePaused: string;
      categories: {
        work: string;
        non_work: string;
        unknown: string;
      };
    };
  };
  report: {
    eyebrow: string;
    title: string;
    description: string;
    intro: {
      prompt: string;
    };
    sections: {
      summary: string;
      moments: string;
      closing: string;
    };
    metrics: {
      togetherTime: string;
      nudges: string;
      chatOpens: string;
      returns: string;
    };
    emotionalKeywords: {
      title: string;
      fallback: string;
      tags: {
        steady: string;
        tired: string;
        focused: string;
        gentle: string;
        return: string;
      };
    };
    closingNote: {
      title: string;
      quiet: string;
      gentle: string;
      active: string;
    };
    timeline: {
      loading: string;
      empty: string;
      expand: string;
      collapse: string;
    };
    format: {
      hoursMinutes: string;
      hoursOnly: string;
      minutesOnly: string;
      zeroDuration: string;
      count: string;
      zeroCount: string;
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
  auth: {
    onboarding: {
      headline: string;
      subheadline: string;
      googleButton: string;
      footnote: string;
    };
    account: {
      section: string;
      signedInAs: string;
      logout: string;
      loggingOut: string;
    };
  };
  onboarding: {
    steps: {
      login: string;
      permissions: string;
      setup: string;
    };
    permissions: {
      headline: string;
      subheadline: string;
      bullets: string[];
      screenStatus: string;
      ocrStatus: string;
      granted: string;
      needed: string;
      unavailable: string;
      checking: string;
      openSettings: string;
      checkAgain: string;
      next: string;
      skip: string;
    };
    setup: {
      headline: string;
      subheadline: string;
      modelLabel: string;
      modelApi: string;
      modelLocal: string;
      modelLocalHint: string;
      personaLabel: string;
      continue: string;
    };
  };
  persona: {
    warm_friend: {
      name: string;
      shortLabel: string;
      description: string;
    };
    loving_partner: {
      name: string;
      shortLabel: string;
      description: string;
    };
    steady_ally: {
      name: string;
      shortLabel: string;
      description: string;
    };
    soft_care: {
      name: string;
      shortLabel: string;
      description: string;
    };
  };
};

/** @deprecated Use AppLocale["companion"] */
export type CompanionLocale = AppLocale["companion"];
