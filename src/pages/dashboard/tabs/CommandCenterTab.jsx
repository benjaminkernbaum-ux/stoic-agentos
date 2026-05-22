import CommandCenterLayout from './command-center/CommandCenterLayout';

export default function CommandCenterTab({ agents, workspaces, observations, knowledgeItems, stats, usage }) {
  return (
    <CommandCenterLayout
      agents={agents}
      workspaces={workspaces}
      observations={observations}
      knowledgeItems={knowledgeItems}
      stats={stats}
      usage={usage}
    />
  );
}
