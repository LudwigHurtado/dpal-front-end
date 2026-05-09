/**
 * DpalNavigatorProvider — mounts the floating button + panel app-wide.
 * Add it once near the top of the React tree (e.g. inside `AppBootstrap`)
 * and the Navigator becomes available across all routes.
 */
import React from "react";
import DpalNavigatorButton from "./DpalNavigatorButton";
import DpalNavigatorPanel from "./DpalNavigatorPanel";

export default function DpalNavigatorProvider(): React.ReactElement {
  return (
    <>
      <DpalNavigatorButton />
      <DpalNavigatorPanel />
    </>
  );
}
