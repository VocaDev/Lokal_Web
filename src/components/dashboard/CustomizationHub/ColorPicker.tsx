'use client';

import { useState, useEffect } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(color);

  // Sync internal state with prop changes
  useEffect(() => {
    setHexValue(color);
  }, [color]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setHexValue(newColor);
    onChange(newColor);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Add # if not present (only if not empty)
    if (value && !value.startsWith('#')) {
      value = '#' + value;
    }

    setHexValue(value);

    // Validate hex (3 or 6 digits)
    if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
      onChange(value);
    }
  };

  return (
    <div className="flex gap-3 items-center">
      {/* Color Square + Input */}
      <div className="relative">
        <input
          type="color"
          value={hexValue.startsWith('#') && (hexValue.length === 4 || hexValue.length === 7) ? hexValue : '#000000'}
          onChange={handleColorChange}
          className="h-12 w-12 rounded-lg border border-[rgba(120,120,255,0.22)] cursor-pointer bg-[#0a0a0f] p-1"
        />
      </div>

      {/* Hex Input */}
      <input
        type="text"
        value={hexValue}
        onChange={handleHexInput}
        placeholder="#4f8ef7"
        className="flex-1 bg-[#0a0a0f] border border-[rgba(120,120,255,0.22)] rounded-lg px-3 py-2 text-[#e8e8f0] placeholder:text-[#5a5a7a] font-mono text-sm focus:outline-none focus:border-[#4f8ef7]"
      />

      {/* Preview Box */}
      <div
        className="h-12 w-12 rounded-lg border border-[rgba(120,120,255,0.22)]"
        style={{ backgroundColor: hexValue }}
        title={hexValue}
      />
    </div>
  );
}
