/** Reference contract only. Integrate with existing game frameworks and persistence, never replace. */
export type Domain = 'mechanics' | 'electricity_magnetism' | 'other';
export type MissionKind = 'predict' | 'experiment' | 'explain' | 'transfer';
export interface ExperimentRecord {
  sceneId: string; missionId: string; kind: MissionKind; completedAt: string;
  paramsBefore: Record<string, number>; paramsAfter: Record<string, number>;
  measured: Record<string, number | string | null>;
  evidence?: string; validityChecked: boolean;
}
export interface AchievementStatus { sceneId: string; completedMissions: string[]; mastery: number; }
export interface ExistingGameBridge {
  /** Existing wallet service: grant exactly once, with idempotency key. */
  awardSharedCoins(amount: number, idempotencyKey: string): Promise<void>;
  readSharedCoins(): number;
  /** Preserve across all previous mechanics achievements; no destructive migrations. */
  getDomainProgress(domain: Domain): number;
  saveDomainProgress(domain: Domain, progress: number): Promise<void>;
  getOverallPhysicsProgress(): number;
  navigateToExistingScreen(screenId: string): void;
  saveExperimentEvidence(experiment: ExperimentRecord): Promise<void>;
  loadAchievement(sceneId: string): Promise<AchievementStatus>;
  showExistingCharacterAnimation(event: 'curious'|'success'|'surprised'|'test'): void;
}
export interface PhysicsModelResponse {valid: boolean; error?: string; [outputName: string]: number | string | boolean | undefined;}
export interface LabRuntime {
  loadScene(sceneId: string): Promise<void>;
  runWithParams(next: Record<string, number>): PhysicsModelResponse;
  pauseSimulation(): void;
  playSimulation(): void;
  resetScene(): void;
}
/** Product task: implement typed adapters, progress migrations, and integration tests. */
