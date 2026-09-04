// src/app/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Select, Spin } from 'antd';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    Sparkles,
    TrendingUp,
    Trophy,
    Search,
    X,
    SlidersHorizontal,
} from 'lucide-react';
import { fetchNewReleases, fetchTopAlbums, searchAlbums } from '../lib/musicApi';
import { listTopRatedAlbums, getAlbumStats } from '../lib/ratings';
import AlbumCard from '../components/AlbumCard';
import styles from './page.module.css';

const GENRES = [
    'Rock',
    'Pop',
    'Hip-Hop/Rap',
    'R&B/Soul',
    'Alternative',
    'Electronic',
    'Jazz',
    'Classical',
    'Country',
    'Latin',
    'Metal',
    'Reggae',
    'Folk',
    'Blues',
    'Singer/Songwriter',
    'World',
];

const DECADES = [
    { value: '2020', label: '2020s' },
    { value: '2010', label: '2010s' },
    { value: '2000', label: '2000s' },
    { value: '1990', label: '1990s' },
    { value: '1980', label: '1980s' },
    { value: '1970', label: '1970s' },
    { value: '1960', label: 'Antes de 1970' },
];

const SORT_OPTIONS = [
    { value: 'relevancia', label: 'Relevância' },
    { value: 'nota', label: 'Nota da comunidade' },
    { value: 'avaliados', label: 'Mais avaliados' },
    { value: 'ano', label: 'Ano (mais recente)' },
    { value: 'az', label: 'A-Z' },
];

// Charts de países diferentes têm catálogos bem diferentes — combinamos
// alguns pra ter um "pool" real de onde filtrar por gênero/década, em vez
// de usar o nome do gênero como se fosse um termo de busca (isso não
// funciona: o iTunes trata "Rock" como texto livre, não como filtro).
const POOL_COUNTRIES = ['us', 'gb', 'br'];

function getYear(releaseDate) {
    if (!releaseDate) return null;
    const year = new Date(releaseDate).getFullYear();
    return Number.isNaN(year) ? null : year;
}

function dedupe(albums) {
    const seen = new Set();
    const result = [];
    for (const a of albums) {
        const id = String(a.id);
        if (seen.has(id)) continue;
        seen.add(id);
        result.push(a);
    }
    return result;
}

export default function AlbunsPage() {
    const [newReleases, setNewReleases] = useState([]);
    const [loadingNew, setLoadingNew] = useState(true);
    const [newError, setNewError] = useState(false);

    const [mostPlayed, setMostPlayed] = useState([]);
    const [loadingMostPlayed, setLoadingMostPlayed] = useState(true);

    const [topRated, setTopRated] = useState([]);
    const [loadingTopRated, setLoadingTopRated] = useState(true);

    // --- filtros avançados ---
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState(null);
    const [decade, setDecade] = useState(null);
    const [sortBy, setSortBy] = useState('relevancia');

    const [filteredResults, setFilteredResults] = useState(null); // null = modo padrão (sem filtro ativo)
    const [filtering, setFiltering] = useState(false);

    useEffect(() => {
        fetchNewReleases({ limit: 12 })
            .then(setNewReleases)
            .catch(() => setNewError(true))
            .finally(() => setLoadingNew(false));

        fetchTopAlbums({ limit: 12 })
            .then(setMostPlayed)
            .catch(() => toast.error('Não consegui carregar os mais ouvidos.'))
            .finally(() => setLoadingMostPlayed(false));

        listTopRatedAlbums(12)
            .then(setTopRated)
            .catch(() => {})
            .finally(() => setLoadingTopRated(false));
    }, []);

    function sortResults(list, by) {
        const copy = [...list];
        if (by === 'nota') return copy.sort((a, b) => b.communityAvg - a.communityAvg);
        if (by === 'avaliados') return copy.sort((a, b) => b.communityCount - a.communityCount);
        if (by === 'ano')
            return copy.sort(
                (a, b) => (getYear(b.releaseDate) || 0) - (getYear(a.releaseDate) || 0),
            );
        if (by === 'az') return copy.sort((a, b) => a.title.localeCompare(b.title));
        return copy;
    }

    async function handleApplyFilters() {
        const term = query.trim();

        if (!term && !genre && !decade) {
            toast.error('Digite algo, ou escolhe pelo menos um filtro (gênero/década).');
            return;
        }

        setFiltering(true);
        try {
            // monta o pool: charts de alguns países + lançamentos recentes,
            // que já vêm com gênero/data reais — mais buscas do termo digitado,
            // se houver, pra pegar coisas fora do top das paradas também.
            const poolPromises = [
                ...POOL_COUNTRIES.map((country) =>
                    fetchTopAlbums({ country, limit: 100 }).catch(() => []),
                ),
                fetchNewReleases({ limit: 100 }).catch(() => []),
            ];
            if (term) {
                poolPromises.push(searchAlbums(term, { limit: 48 }).catch(() => []));
            }

            const poolResults = await Promise.all(poolPromises);
            let pool = dedupe(poolResults.flat());

            // filtro de termo — aplicado no pool inteiro, não só nos resultados
            // da busca, pra pegar também o que vier dos charts.
            if (term) {
                const lower = term.toLowerCase();
                pool = pool.filter(
                    (a) =>
                        a.title.toLowerCase().includes(lower) ||
                        a.artist.toLowerCase().includes(lower),
                );
            }

            // filtro de gênero — usando o campo genre real, não mais "gênero
            // como termo de busca" (isso não funcionava de verdade).
            if (genre) {
                pool = pool.filter(
                    (a) => a.genre && a.genre.toLowerCase().includes(genre.toLowerCase()),
                );
            }

            // filtro de década
            if (decade) {
                const start = Number(decade);
                pool = pool.filter((a) => {
                    const year = getYear(a.releaseDate);
                    if (!year) return false;
                    return decade === '1960' ? year < 1970 : year >= start && year < start + 10;
                });
            }

            if (pool.length === 0) {
                toast('Nada encontrado com esses filtros. Tenta ajustar.');
                setFilteredResults([]);
                return;
            }

            // limita antes de buscar a média da comunidade, pra não estourar
            // leitura do Firestore à toa
            const capped = pool.slice(0, 60);

            const withStats = await Promise.all(
                capped.map(async (a) => {
                    const stats = await getAlbumStats(a.id).catch(() => null);
                    return {
                        ...a,
                        communityAvg: stats?.average || 0,
                        communityCount: stats?.count || 0,
                    };
                }),
            );

            setFilteredResults(sortResults(withStats, sortBy));
        } catch (err) {
            toast.error('Não consegui aplicar os filtros agora. Tenta de novo.');
        } finally {
            setFiltering(false);
        }
    }

    function handleSortChange(value) {
        setSortBy(value);
        if (filteredResults) setFilteredResults((prev) => sortResults(prev, value));
    }

    function clearFilters() {
        setQuery('');
        setGenre(null);
        setDecade(null);
        setSortBy('relevancia');
        setFilteredResults(null);
    }

    const showingFilters = filteredResults !== null;

    return (
        <div className={styles.page}>
            <Link href="/" className={styles.backLink}>
                <ArrowLeft size={16} /> voltar
            </Link>

            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Álbuns</h1>
                <p className={styles.pageSub}>Descubra, explore e avalie o que está tocando.</p>
            </div>

            <div className={styles.filtersBar}>
                <Input
                    className={styles.searchInputAdv}
                    size="large"
                    placeholder="Nome do álbum ou artista (opcional)…"
                    prefix={<Search size={16} color="#6f6860" />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPressEnter={handleApplyFilters}
                />
                <Select
                    className={styles.selectAdv}
                    size="large"
                    placeholder="Gênero"
                    allowClear
                    value={genre}
                    onChange={setGenre}
                    options={GENRES.map((g) => ({ value: g, label: g }))}
                />
                <Select
                    className={styles.selectAdv}
                    size="large"
                    placeholder="Década"
                    allowClear
                    value={decade}
                    onChange={setDecade}
                    options={DECADES}
                />
                <Select
                    className={styles.selectAdv}
                    size="large"
                    value={sortBy}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                />
                <button
                    type="button"
                    className={styles.applyBtn}
                    onClick={handleApplyFilters}
                    disabled={filtering}>
                    <SlidersHorizontal size={15} />
                    {filtering ? 'Filtrando…' : 'Aplicar filtros'}
                </button>
                {showingFilters && (
                    <button type="button" className={styles.clearAdvBtn} onClick={clearFilters}>
                        <X size={14} /> limpar
                    </button>
                )}
            </div>

            {showingFilters ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>Resultados filtrados</h2>
                        <span className={styles.sectionNote}>{filteredResults.length} álbuns</span>
                    </div>

                    {filtering ? (
                        <div className={styles.loadingRow}>
                            <Spin /> <span>aplicando filtros…</span>
                        </div>
                    ) : filteredResults.length === 0 ? (
                        <div className={styles.emptyState}>
                            Nada encontrado com esses filtros. Tenta ajustar.
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredResults.map((album) => (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    average={album.communityAvg || undefined}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <>
                    {/* Descobertas da semana */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>
                                <Sparkles size={18} />
                                Descobertas da semana
                            </h2>
                        </div>
                        {loadingNew ? (
                            <div className={styles.loadingRow}>
                                <Spin /> <span>carregando lançamentos…</span>
                            </div>
                        ) : newError || newReleases.length === 0 ? (
                            <div className={styles.emptyState}>
                                Não consegui carregar os lançamentos recentes agora. Tenta de novo
                                mais tarde.
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {newReleases.map((album) => (
                                    <AlbumCard key={album.id} album={album} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Mais ouvidos */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>
                                <TrendingUp size={18} />
                                Mais ouvidos
                            </h2>
                            <span className={styles.sectionNote}>chart oficial Apple Music</span>
                        </div>
                        {loadingMostPlayed ? (
                            <div className={styles.loadingRow}>
                                <Spin /> <span>carregando…</span>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {mostPlayed.map((album) => (
                                    <AlbumCard key={album.id} album={album} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Mais bem avaliados (comunidade Riffnote) */}
                    <section className={styles.section}>
                        <div className={styles.sectionHead}>
                            <h2 className={styles.sectionTitle}>
                                <Trophy size={18} />
                                Mais bem avaliados
                            </h2>
                            <span className={styles.sectionNote}>pela comunidade Riffnote</span>
                        </div>
                        {loadingTopRated ? (
                            <div className={styles.loadingRow}>
                                <Spin /> <span>carregando…</span>
                            </div>
                        ) : topRated.length === 0 ? (
                            <div className={styles.emptyState}>
                                Ninguém avaliou nenhum álbum ainda. Seja o primeiro!
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {topRated.map((item) => (
                                    <AlbumCard
                                        key={item.albumId}
                                        album={{
                                            id: item.albumId,
                                            title: item.albumTitle,
                                            artist: item.albumArtist,
                                            artwork: item.artwork,
                                        }}
                                        average={item.average}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
