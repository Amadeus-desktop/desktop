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
    mateIcon: {
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
      refresh: string;
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
      you: string;
      typing: string;
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
      mate: string;
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
    logout: {
      preparing: {
        eyebrow: string;
        title: string;
        subtitle: string;
      };
      complete: {
        eyebrow: string;
        title: string;
        subtitle: string;
        hint: string;
      };
    };
    profile: {
      eyebrow: string;
      title: string;
      description: string;
      displayNameLabel: string;
      displayNameHint: string;
      emailLabel: string;
      openSettings: string;
      modelRouteLabel: string;
      modelRouteHint: string;
    };
  };
  onboarding: {
    steps: {
      login: string;
      permissions: string;
      modelRoute: string;
      setup: string;
    };
    permissions: {
      headline: string;
      subheadline: string;
      promiseChips: string[];
      statusLabel: string;
      granted: string;
      needed: string;
      checking: string;
      requestAccess: string;
      settingsHint: string;
      requestFailed: string;
      next: string;
      skip: string;
    };
    setup: {
      headline: string;
      subheadline: string;
      mateLabel: string;
      continue: string;
    };
    modelRoute: {
      headline: string;
      subheadline: string;
      continue: string;
      apiHint: string;
      localHint: string;
      options: {
        api: {
          title: string;
          description: string;
        };
        local: {
          title: string;
          description: string;
        };
      };
    };
    preparing: {
      eyebrow: string;
      title: string;
      subtitle: string;
      doneEyebrow: string;
      doneTitle: string;
      doneSubtitle: string;
      doneHint: string;
    };
  };
  persona: {
    "seoyeon-modern-senior": {
      name: string;
      shortLabel: string;
      description: string;
    };
    "eiren-fantasy-guardian": {
      name: string;
      shortLabel: string;
      description: string;
    };
    "makise-kurisu": {
      name: string;
      shortLabel: string;
      description: string;
    };
  };
};

/** @deprecated Use AppLocale["companion"] */
export type CompanionLocale = AppLocale["companion"];
