import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomeBanner.css';

const HomeBanner = () => {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    const CDN_ROOT = 'https://cdn.verdinha.wtf';
    const IMG_BASE = `${CDN_ROOT}/scans`;

    const slugify = (str) => {
        if (!str) return 'obra';
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    };

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const res = await fetch('/api-tenrai/obras/ranking?tipo=visualizacoes_geral&pagina=1&limite=5&gen_id=1', {
                    headers: {
                        Authorization: 'Bearer 093259483aecaf3e4eb19f29bb97a89b789fa48ccdc2f1ef22f35759f518e48a8a57c476b74f3025eca4edcfd68d01545604159e2af02d64f4b803f2fd2e3115',
                        Accept: 'application/json'
                    }
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.obras) {
                        setRanking(json.obras);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch ranking", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRanking();
    }, []);

    if (loading) {
        return (
            <div className="home-ranking-container skeleton-ranking">
                <div className="ranking-header-skeleton"></div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="ranking-row-skeleton"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="home-ranking-container">
            <div className="ranking-header">
                <span className="ranking-title">Top Obras</span>
                <span className="ranking-subtitle">Ranque de Visualizações!</span>
            </div>

            <div className="ranking-table">
                <div className="ranking-table-header">
                    <div className="col-rank">#</div>
                    <div className="col-obra">Obra</div>
                    <div className="col-caps">Capítulos</div>
                    <div className="col-views">Visualizações</div>
                </div>

                {ranking.map((obra, index) => {
                    const rawName = obra.obr_imagem ? String(obra.obr_imagem) : '';
                    const imgBasename = rawName ? rawName.split('/').pop().trim() : null;
                    const obraId = obra.obr_id != null ? String(obra.obr_id).trim() : '';
                    let imgUrl;
                    if (rawName && rawName.includes('/')) {
                        imgUrl = `${CDN_ROOT}/${rawName.replace(/^\/+/, '')}`;
                    } else if (imgBasename && obraId) {
                        imgUrl = `${IMG_BASE}/1/obras/${encodeURIComponent(obraId)}/${encodeURIComponent(imgBasename)}`;
                    }

                    return (
                        <Link key={obra.obr_id} to={`/obra/${slugify(obra.obr_nome)}`} className="ranking-row">
                            <div className="col-rank">
                                <span className={`rank-number rank-${index + 1}`}>{index + 1}</span>
                            </div>
                            <div className="col-obra">
                                <div className="obra-cell">
                                    <img src={imgUrl} alt={obra.obr_nome} className="rank-cover" />
                                    <div className="rank-info">
                                        <span className="rank-name">{obra.obr_nome}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-caps">{obra.total_capitulos || 0}</div>
                            <div className="col-views">{(obra.visualizacoes_geral || 0).toLocaleString()}</div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default HomeBanner;
