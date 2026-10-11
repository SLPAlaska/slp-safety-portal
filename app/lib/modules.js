// Wires the module manifest and this deployment's switches into the gate.
// To turn a module off: set config/portal.json modules.switches.<id> = false,
// or list the id in NEXT_PUBLIC_DISABLED_MODULES, then redeploy.
import manifest from '../../config/modules.json'
import portal from '../../config/portal.json'
import { makeGate } from './moduleGate'

export const moduleGate = makeGate(
  manifest,
  (portal && portal.modules && portal.modules.switches) || {},
  process.env.NEXT_PUBLIC_DISABLED_MODULES || ''
)

export const isModuleEnabled = moduleGate.isEnabled
export const isPathEnabled = moduleGate.isPathEnabled
export const filterCategories = moduleGate.filterCategories
