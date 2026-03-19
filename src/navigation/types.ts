export type RootStackParamList = {
  Home: undefined;
  Result: {
    suggestedWakeAt: number;
    suggestedSleepAt: number;
    cycles: number;
    targetWakeAt: number;
    flexibilityMinutes: number;
  };
  Nap: undefined;
  Settings: undefined;
};

