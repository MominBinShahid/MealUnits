import type { Category } from '../data/carbs.js';

/**
 * The food families whose rows are genuinely TWO-DIMENSIONAL, and which are
 * therefore shown as a table rather than as a list.
 *
 * The distinction this file exists to hold: a GRID is a layout — tiles whose
 * arrangement means nothing — and this project has no use for one, because a
 * tile cannot carry the portion, the confidence and the source that a row
 * carries, and dropping those to save pixels is the trade this app refuses
 * everywhere else. A MATRIX is a claim about the DATA: both axes are real
 * variables, so where a cell sits is itself information.
 *
 * Three families qualify out of 320 rows, and in each the arrangement teaches
 * something no list can:
 *
 *   both teas     every spoon of sugar is +4 g, at every cup size
 *   biryani       WHICH POT moves the number as much as how big the plate —
 *                 41 g to 60 g at one plate size, which nobody reading eight
 *                 separate rows would ever notice
 *
 * Everything else in the table has one axis (which naan, which size of rice)
 * and stays a list.
 *
 * Declared here rather than derived from the names, because deriving it would
 * mean parsing "large mug, 3 sugars" out of prose and silently dropping a cell
 * the day somebody rewords a row. A test asserts every id below exists and that
 * none appears twice.
 */
export interface FoodMatrix {
  /** Copy key for the heading, and for the two axis legends. */
  readonly key: 'chai' | 'doodhPatti' | 'biryani';
  /** Which group it renders inside. */
  readonly category: Category;
  /** Copy keys for the row labels, top to bottom. */
  readonly rows: readonly string[];
  /** Copy keys for the column labels, leading edge outwards. */
  readonly columns: readonly string[];
  /** `Food.id` per cell, rows then columns. `null` where no row exists. */
  readonly cells: readonly (readonly (string | null)[])[];
}

export const MATRICES: readonly FoodMatrix[] = [
  {
    key: 'chai',
    category: 'drink',
    rows: ['smallCup', 'mug', 'largeMug'],
    columns: ['noSugar', 'oneSugar', 'twoSugars', 'threeSugars'],
    cells: [
      ['chai-150-0', 'chai-150-1', 'chai-150-2', 'chai-150-3'],
      ['chai-200-0', 'chai-200-1', 'chai-200-2', 'chai-200-3'],
      ['chai-250-0', 'chai-250-1', 'chai-250-2', 'chai-250-3'],
    ],
  },
  {
    key: 'doodhPatti',
    category: 'drink',
    rows: ['smallCup', 'mug', 'largeMug'],
    columns: ['noSugar', 'oneSugar', 'twoSugars', 'threeSugars'],
    cells: [
      ['patti-150-0', 'patti-150-1', 'patti-150-2', 'patti-150-3'],
      ['patti-200-0', 'patti-200-1', 'patti-200-2', 'patti-200-3'],
      ['patti-250-0', 'patti-250-1', 'patti-250-2', 'patti-250-3'],
    ],
  },
  {
    key: 'biryani',
    category: 'rice',
    rows: ['meatHeavy', 'midPot', 'riceHeavy'],
    columns: ['plate', 'dawatPlate'],
    cells: [
      ['biryani-meat-heavy-plate', 'biryani-meat-heavy-dawat'],
      ['biryani-mid-plate', 'biryani-mid-dawat'],
      ['biryani-rice-heavy-plate', 'biryani-rice-heavy-dawat'],
    ],
  },
];

/** Every id any matrix claims — what the list must NOT also render as a row. */
export const IN_A_MATRIX: ReadonlySet<string> = new Set(
  MATRICES.flatMap((matrix) => matrix.cells.flat().filter((id): id is string => id !== null)),
);
