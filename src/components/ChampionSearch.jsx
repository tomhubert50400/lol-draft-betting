import React, { useState, useEffect, useRef } from "react";
import { useChampions } from "../contexts/ChampionsContext";

export default function ChampionSearch({
  value,
  onChange,
  excludedChampions = [],
  disabled = false,
  placeholder = "Rechercher un champion...",
}) {
  const { champions, version, loading, getChampionImageUrl } = useChampions();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredChampions, setFilteredChampions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (champions.length === 0) {
      setFilteredChampions([]);
      return;
    }

    const excludedSet = new Set(excludedChampions);
    
    const available = champions.filter((champ) => {
      if (champ.name === value) return true;
      return !excludedSet.has(champ.name);
    });

    if (searchTerm.trim() === "") {
      setFilteredChampions(available);
    } else {
      const term = searchTerm.toLowerCase();
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
          
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return a.name.localeCompare(b.name);
        });
      setFilteredChampions(filtered);
    }
  }, [searchTerm, champions, excludedChampions, value]);

  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    } else {
      setSearchTerm("");
    }
  }, [value]);

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
            src={getChampionImageUrl(selectedChampion.id)}
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
                src={getChampionImageUrl(champion.id)}
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

