import L from 'leaflet'
import { TipoPOI, POI_CONFIG } from '@/types'

export function criarIconePOI(tipo: TipoPOI): L.DivIcon {
  const config = POI_CONFIG[tipo]

  return L.divIcon({
    html: `<div style="
      background: white;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid ${config.cor};
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    ">${config.emoji}</div>`,
    className: 'poi-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  })
}
