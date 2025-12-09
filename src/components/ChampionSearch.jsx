import React, { useState, useEffect, useRef } from "react";

// Cache pour les données des champions
let championsCache = null;
let versionCache = null;

async function fetchLatestVersion() {
  if (versionCache) return versionCache;
  try {
    const response = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await response.json();
    versionCache = versions[0]; // La première version est la plus récente
    return versionCache;
  } catch (error) {
    console.error("Error fetching version:", error);
    return "14.1.1"; // Version de fallback
  }
}

async function fetchChampions() {
  if (championsCache) return championsCache;
  
  try {
    const version = await fetchLatestVersion();
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
    );
    const data = await response.json();
    
    // Convertir l'objet en tableau avec nom et id
    const champions = Object.values(data.data).map((champ) => ({
      name: champ.name,
      id: champ.id,
      key: champ.key,
    }));
    
    championsCache = { champions, version };
    return championsCache;
  } catch (error) {
    console.error("Error fetching champions:", error);
    return { champions: [], version: "14.1.1" };
  }
}

function getChampionImageUrl(championId, version) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championId}.png`;
}

export default function ChampionSearch({
  value,
  onChange,
  excludedChampions = [],
  disabled = false,
  placeholder = "Rechercher un champion...",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChampions, setFilteredChampions] = useState([]);
  const [champions, setChampions] = useState([]);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    async function loadChampions() {
      setLoading(true);
      const { champions: champs, version: v } = await fetchChampions();
      setChampions(champs);
      setVersion(v);
      setLoading(false);
    }
    loadChampions();
  }, []);

  // Filtrer les champions exclus et par terme de recherche
  useEffect(() => {
    if (champions.length === 0) {
      setFilteredChampions([]);
      return;
    }

    // Créer un Set pour une recherche rapide des champions exclus
    const excludedSet = new Set(excludedChampions);
    
    // Filtrer les champions exclus (sauf celui actuellement sélectionné)
    const available = champions.filter((champ) => {
      if (champ.name === value) return true; // Toujours inclure le champion sélectionné
      return !excludedSet.has(champ.name);
    });

    // Filtrer par terme de recherche
    if (searchTerm.trim() === "") {
      setFilteredChampions(available);
    } else {
      const term = searchTerm.toLowerCase();
      // Prioriser les champions qui commencent par le terme, puis ceux qui le contiennent
      const filtered = available
        .filter((champ) => {
          const nameLower = champ.name.toLowerCase();
          return nameLower.startsWith(term) || nameLower.includes(term);
        })
        .sort((a, b) => {
          const aLower = a.name.toLowerCase();
          const bLower = b.name.toLowerCase();
          const aStarts = aLower.startsWith(term);
          const bStarts = bLower.startsWith(term);
          
          // Les champions qui commencent par le terme viennent en premier
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.name.localeCompare(b.name);
        });
      setFilteredChampions(filtered);
    }
  }, [searchTerm, champions, excludedChampions, value]);

  // Mettre à jour le terme de recherche quand la valeur change
  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    } else {
      setSearchTerm("");
    }
  }, [value]);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setShowDropdown(true);
  };

  const handleSelectChampion = (championName) => {
    setSearchTerm(championName);
    onChange(championName);
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
    setShowDropdown(false);
  };

  if (loading) {
    return (
      <div className="champion-search">
        <input
          type="text"
          placeholder="Chargement des champions..."
          disabled
          className="champion-search-input"
        />
      </div>
    );
  }

  const selectedChampion = champions.find((c) => c.name === value);

  return (
    <div className="champion-search-wrapper">
      <div className="champion-search" ref={searchRef}>
        {selectedChampion && version && (
          <img
            src={getChampionImageUrl(selectedChampion.id, version)}
            alt={selectedChampion.name}
            className="champion-search-selected-image"
          />
        )}
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="champion-search-input"
          style={{ minWidth: 0, maxWidth: '100%' }}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="champion-search-clear"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>
      {showDropdown && filteredChampions.length > 0 && (
        <div className="champion-search-dropdown" ref={dropdownRef}>
          {filteredChampions.slice(0, 10).map((champion) => (
            <div
              key={champion.id}
              className="champion-search-option"
              onClick={() => handleSelectChampion(champion.name)}
            >
              <img
                src={getChampionImageUrl(champion.id, version)}
                alt={champion.name}
                className="champion-search-option-image"
              />
              <span className="champion-search-option-name">
                {champion.name}
              </span>
            </div>
          ))}
          {filteredChampions.length > 10 && (
            <div className="champion-search-more">
              +{filteredChampions.length - 10} autres champions
            </div>
          )}
        </div>
      )}
      {showDropdown &&
        searchTerm.trim() !== "" &&
        filteredChampions.length === 0 && (
          <div className="champion-search-dropdown">
            <div className="champion-search-no-results">
              Aucun champion trouvé
            </div>
          </div>
        )}
    </div>
  );
}

