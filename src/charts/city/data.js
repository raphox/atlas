import { REGIONS, STATUS } from "../../model.js";

/**
 * @typedef {object} CityDatum
 * @property {string|number} id Stable, unique company key.
 * @property {string} name Company display name.
 * @property {number} users Nonnegative user count; encodes building height.
 * @property {1|2|3|4|5|6|7} mask Exact system intersection; encodes district/color.
 * @property {"healthy"|"warning"|"critical"} status Health classification.
 */

/** Validate at the chart boundary, before layout or GPU allocation. */
export function validateCityData(data) {
  if (!Array.isArray(data))
    throw new TypeError("cityMark: data deve ser uma lista.");
  const ids = new Set();
  for (const [index, datum] of data.entries()) {
    if (
      !datum ||
      !["string", "number"].includes(typeof datum.id) ||
      !String(datum.id).trim() ||
      ids.has(String(datum.id))
    )
      throw new TypeError(
        `cityMark: id ausente ou repetido na linha ${index}.`,
      );
    if (
      typeof datum.name !== "string" ||
      !datum.name.trim() ||
      !Number.isFinite(datum.users) ||
      datum.users < 0 ||
      !REGIONS.some((region) => region.mask === datum.mask) ||
      !Object.hasOwn(STATUS, datum.status)
    )
      throw new TypeError(
        `cityMark: nome, usuários, sistemas ou saúde inválidos na linha ${index}.`,
      );
    ids.add(String(datum.id));
  }
}
