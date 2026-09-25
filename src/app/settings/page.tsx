'use client';

// Settings Page
// src/app/settings/page.tsx

import { useState, useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Settings, DEFAULT_CATEGORIES } from '@/lib/utils';
import type { Theme } from '@/types';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSizeState] = useState('md');
  const [textWidth, setTextWidthState] = useState('medium');
  const [showImages, setShowImages] = useState(true);
  const [defaultCategory, setDefaultCategory] = useState('latest');
  
  useEffect(() => {
    setFontSizeState(Settings.get('reader-font-size', 'md'));
    setTextWidthState(Settings.get('reader-width', 'medium'));
    setShowImages(Settings.get('show-images', true));
    setDefaultCategory(Settings.get('default-category', 'latest'));
  }, []);
  
  const save = (key: string, value: unknown) => {
    Settings.set(key, value);
  };
  
  return (
    <div className="container" style={{ paddingTop: 20, maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>
        ⚙️ Cài đặt
      </h1>
      
      {/* Theme */}
      <Section title="Giao diện">
        <SettingRow label="Theme">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'light', label: '☀️ Sáng' },
              { value: 'dark', label: '🌙 Tối' },
              { value: 'system', label: '💻 Hệ thống' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value as Theme)}
                className={`category-pill ${theme === opt.value ? 'category-pill--active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>
      
      {/* Reader */}
      <Section title="Chế độ đọc">
        <SettingRow label="Cỡ chữ">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'sm', label: 'Nhỏ' },
              { value: 'md', label: 'Vừa' },
              { value: 'lg', label: 'Lớn' },
              { value: 'xl', label: 'Rất lớn' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setFontSizeState(opt.value); save('reader-font-size', opt.value); }}
                className={`category-pill ${fontSize === opt.value ? 'category-pill--active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
        
        <SettingRow label="Độ rộng văn bản">
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { value: 'narrow', label: 'Hẹp' },
              { value: 'medium', label: 'Vừa' },
              { value: 'wide', label: 'Rộng' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setTextWidthState(opt.value); save('reader-width', opt.value); }}
                className={`category-pill ${textWidth === opt.value ? 'category-pill--active' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>
      
      {/* Display */}
      <Section title="Hiển thị">
        <SettingRow label="Hiển thị hình ảnh">
          <ToggleSwitch
            checked={showImages}
            onChange={(v) => { setShowImages(v); save('show-images', v); }}
          />
        </SettingRow>
        
        <SettingRow label="Chuyên mục mặc định">
          <select
            value={defaultCategory}
            onChange={e => { setDefaultCategory(e.target.value); save('default-category', e.target.value); }}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          >
            {DEFAULT_CATEGORIES.map(cat => (
              <option key={cat.slug} value={cat.slug}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </SettingRow>
      </Section>
      
      {/* About */}
      <Section title="Về ứng dụng">
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p><strong>DailyRead</strong> - Đọc tin tức cá nhân</p>
          <p>Phiên bản: 1.0.0</p>
          <p>Không quảng cáo. Không tracker. Tập trung vào nội dung.</p>
          <p style={{ marginTop: 12 }}>
            Dữ liệu bookmark và cài đặt được lưu trên thiết bị của bạn (localStorage).
          </p>
        </div>
        
        <button
          onClick={() => {
            if (confirm('Xóa toàn bộ dữ liệu lưu trữ (bookmark, lịch sử)?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="btn btn-secondary"
          style={{ marginTop: 16, color: '#e53e3e' }}
        >
          🗑️ Xóa dữ liệu cục bộ
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ 
        fontSize: 14,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--accent)' : 'var(--border-color)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2,
        left: checked ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        background: 'white',
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}
