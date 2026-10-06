"use client";

import { useEffect, useState } from "react";
import type { BuilderData, ProjectPatch } from "./shared";

const examples = {
  wedding: {
    headline: "We said yes. Come celebrate with us.",
    story: "We met in 2019 at a friend's birthday. Seven years, two cities and one very long argument about jollof later, here we are...",
    message: "To everyone who prayed for us, laughed with us and carried us: thank you. This day is yours too.",
  },
  birthday: {
    headline: "Another year of you, and we are grateful.",
    story: "Tell the story of who they are: how you met, what they love, what makes you laugh together...",
    message: "Happy birthday. Write the words you have been meaning to say.",
  },
  anniversary: {
    headline: "Still choosing you.",
    story: "Tell the story of your years together: the first day, the hard days, the days that made you.",
    message: "Write a note to your partner here.",
  },
} as const;

export function Words({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const ex = examples[project.occasion];
  const [headline, setHeadline] = useState(project.headline ?? "");
  const [story, setStory] = useState(project.story ?? "");
  const [message, setMessage] = useState(project.message ?? "");
  useEffect(() => { setHeadline(project.headline ?? ""); setStory(project.story ?? ""); setMessage(project.message ?? ""); }, [project._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <label className="field">
        <span>Headline</span>
        <input type="text" maxLength={120} value={headline} placeholder={ex.headline} onChange={(e) => setHeadline(e.target.value)} onBlur={() => headline !== (project.headline ?? "") && void save({ headline })} />
        <div className="hint">One line under the names at the top of your website.</div>
      </label>
      <label className="field">
        <span>Your story</span>
        <textarea maxLength={2000} value={story} placeholder={ex.story} onChange={(e) => setStory(e.target.value)} onBlur={() => story !== (project.story ?? "") && void save({ story })} />
        <div className="hint">{story.length} of 2000</div>
      </label>
      <label className="field">
        <span>A note to your guests</span>
        <textarea maxLength={4000} value={message} placeholder={ex.message} onChange={(e) => setMessage(e.target.value)} onBlur={() => message !== (project.message ?? "") && void save({ message })} />
        <div className="hint">This shows in a card near the end of your website. We also use your words in your videos.</div>
      </label>
      <label className="row" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={project.wishesOn} onChange={(e) => void save({ wishesOn: e.target.checked })} style={{ width: 22, height: 22 }} />
        <span className="grow"><b>Let guests leave wishes</b><span className="hint" style={{ display: "block" }}>Wishes wait for your approval before anyone sees them.</span></span>
      </label>
    </div>
  );
}
