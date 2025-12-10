import React from "react";
import ChampionSearch from "./ChampionSearch";

const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support"];

export default function DraftSelector({
  teamName,
  selections,
  onSelect,
  disabled,
  excludedChampions = [],
}) {
  const teamSelectedChampions = Object.values(selections).filter(Boolean);

  const allExcludedChampions = [
    ...new Set([...teamSelectedChampions, ...excludedChampions]),
  ];

  const getExcludedChampionsForRole = (currentRole) => {
    const currentSelection = selections[currentRole];
    return allExcludedChampions.filter((champ) => champ !== currentSelection);
  };

  return (
    <div className="draft-selector">
      <h4>{teamName} Draft</h4>
      <div className="roles-grid">
        {ROLES.map((role) => {
          const excludedForRole = getExcludedChampionsForRole(role);
          return (
            <div key={role} className="role-input">
              <label>{role}</label>
              <ChampionSearch
                value={selections[role] || ""}
                onChange={(champion) => onSelect(role, champion)}
                excludedChampions={excludedForRole}
                disabled={disabled}
                placeholder="Rechercher un champion..."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
