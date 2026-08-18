'use client';
import React from 'react';

export default function Dashboard() {
  return (
    <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #1e293b', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#38bdf8' }}>
            HOTELEQUIP.PT • DocFlow Enterprise
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
            Gestão Documental, Conciliação Bancária & Faturação Moloni / TOConline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ padding: '6px 12px', background: '#0c4a6e', color: '#38bdf8', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            Agosto 2026
          </span>
          <span style={{ padding: '6px 12px', background: '#064e3b', color: '#34d399', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>
            ● Sistema Online
          </span>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>FATURAÇÃO EMITIDA</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', margin: '8px 0' }}>48.250,00 €</div>
          <div style={{ color: '#34d399', fontSize: '12px' }}>+18.4% vs mês anterior</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>COMPRAS & ENCARGOS</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#f8fafc', margin: '8px 0' }}>29.800,00 €</div>
          <div style={{ color: '#f87171', fontSize: '12px' }}>PT, UE (RITI) e DUA</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>ESTIMATIVA DE IVA (AT)</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', margin: '8px 0' }}>4.243,50 €</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>A entregar no dia 15</div>
        </div>

        <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>CONCILIAÇÃO BANCÁRIA</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#38bdf8', margin: '8px 0' }}>94%</div>
          <div style={{ color: '#34d399', fontSize: '12px' }}>47 de 50 Movimentos</div>
        </div>
      </section>
    </main>
  );
}
