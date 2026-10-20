import { CapabilityContribution, type CapabilityState } from "@inferative/base/capabilities";
import { VisualEditingCapability } from "@inferative/visual-editing/api";

/**
 * The capabilities of the parts that run in another Worker of this deployment. That Worker serves their routes on the
 * hostname of the dashboard, so the dashboard announces them: its navigation shows their entries.
 */
export class OtherWorkerCapabilities extends CapabilityContribution {
  public capabilities(): readonly CapabilityState[] {
    return [{ capability: VisualEditingCapability, enabled: true }];
  }
}
