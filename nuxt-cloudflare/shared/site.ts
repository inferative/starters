// The declarations of this site: its content types and its section catalog. The `inferative` command line
// loads this file to build the manifest that `inferative site sync` publishes. The values of a deployment (the
// channel slug, the API origin, the site name) are the `site` section of `inferative.config.ts`. The key that
// publishes the manifest is never in the repository.

import { EntityField, SortDirection } from "@inferative/base/api";
import { ContentListColumn } from "@inferative/base/core";
import { defineContentType } from "@inferative/content/public";
import { PageFields, menuFields, menuTypeOptions, pageTypeOptions } from "@inferative/pages/public";
import {
  defineSite,
  starterCommerceSections,
  starterEventSections,
  starterFormSections,
  starterMediaSections,
  starterSections,
  starterVideoSections
} from "@inferative/sdk/site";

/**
 * The content types of this site. `page` is the one addressable type: a page is a title, a slug and a list of
 * sections. `menu` is a stored list of links, which the `navigationMenu` section draws. Add a type here to give
 * the site another kind of content.
 */
const siteContentTypes = {
  page: defineContentType({
    ...pageTypeOptions,
    table: {
      columns: [ContentListColumn.Status, ContentListColumn.Updated],
      sort: { column: ContentListColumn.Updated, direction: SortDirection.Descending }
    },
    form: { sections: [{ fields: ["title", "slug"] }, { fields: ["sections"] }] },
    fields: {
      ...PageFields,
      sections: EntityField.sections({ optional: true }).label("Sections").declaration
    }
  }),
  menu: defineContentType({ ...menuTypeOptions, fields: menuFields({ pageTypes: ["page"] }) })
};

/** The section catalog without `sharedSection`: a channel that has never served a manifest refuses that key. */
const firstSyncSections = Object.fromEntries(
  Object.entries(starterSections).filter(([key]) => key !== "sharedSection")
);

export default defineSite({
  contentTypes: siteContentTypes,
  sectionTypes: starterSections,
  firstSyncSectionTypes: firstSyncSections,
  unclaimedSectionKeys: [],
  // The layer ships the components of these sets. This site composes none of their packages.
  optInSectionSets: [
    starterCommerceSections,
    starterEventSections,
    starterVideoSections,
    starterFormSections,
    starterMediaSections
  ]
});
