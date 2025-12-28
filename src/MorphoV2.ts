import { ponder } from "ponder:registry";
import { vaultV2 } from "ponder:schema";
import { zeroAddress } from "viem";

/**
 * @dev Morpho V2 Event Handlers
 *
 * This file contains event handlers for Morpho V2 vault events.
 * Events are organized into logical sections following the v1 pattern.
 */

/*//////////////////////////////////////////////////////////////
                        VAULT CREATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:Constructor", async ({ event, context }) => {
  await context.db.insert(vaultV2).values({
    // Primary key
    chainId: context.chain.id,
    address: event.log.address,
    // Immutables
    asset: event.args.asset,
    owner: event.args.owner,
    // Defaults - these will be set by subsequent events
    curator: zeroAddress,
    name: "",
    symbol: "",
  });
});

/*//////////////////////////////////////////////////////////////
                            OWNERSHIP
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetOwner", async ({ event, context }) => {
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ owner: event.args.newOwner });
});

/*//////////////////////////////////////////////////////////////
                          CONFIGURATION
//////////////////////////////////////////////////////////////*/

ponder.on("MorphoV2:SetCurator", async ({ event, context }) => {
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ curator: event.args.newCurator });
});

ponder.on("MorphoV2:SetName", async ({ event, context }) => {
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ name: event.args.newName });
});

ponder.on("MorphoV2:SetSymbol", async ({ event, context }) => {
  await context.db
    .update(vaultV2, { chainId: context.chain.id, address: event.log.address })
    .set({ symbol: event.args.newSymbol });
});
