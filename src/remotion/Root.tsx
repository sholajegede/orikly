import { Composition } from "remotion";
import "../app/globals.css";
import { filmSeconds } from "@convex/lib/design";
import { FILM_FPS, FILM_SIZE, Film, type FilmProps } from "./Film";
import { SHOT_VIEW, Shot, type ShotProps } from "./Shot";

/** What the studio job can render: the film in either shape, and still photographs of the website. */
export function Root() {
  return (
    <>
      <Composition
        id="Film"
        component={Film as unknown as React.ComponentType<Record<string, unknown>>}
        fps={FILM_FPS}
        width={1080}
        height={1920}
        durationInFrames={300}
        defaultProps={{ format: "portrait" } as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => {
          const p = props as unknown as FilmProps;
          return { ...FILM_SIZE[p.format], durationInFrames: Math.max(30, Math.round(filmSeconds(p.data.design) * FILM_FPS)) };
        }}
      />
      <Composition
        id="Shot"
        component={Shot as unknown as React.ComponentType<Record<string, unknown>>}
        fps={30}
        width={390}
        height={844}
        durationInFrames={1}
        defaultProps={{ view: "phone", offset: 0 } as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => SHOT_VIEW[(props as unknown as ShotProps).view]}
      />
    </>
  );
}
