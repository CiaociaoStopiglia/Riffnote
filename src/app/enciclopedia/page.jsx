// src/app/enciclopedia/page.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input, Select, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, BookOpen } from 'lucide-react';
import { searchAlbums } from '../lib/musicApi';
import { getAlbumStats } from '../lib/ratings';
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

function getYear(releaseDate) {
    if (!releaseDate) return null;
    const year = new Date(releaseDate).getFullYear();
    return Number.isNaN(year) ? null : year;
}

export default function EnciclopediaPage() {
    const [query, setQuery] = useState('');
    const [genre, setGenre] = useState(null);
    const [decade, setDecade] = useState(null);
    const [sortBy, setSortBy] = useState('relevancia');

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    async function handleSearch() {
        const term = query.trim() || genre;
        if (!term) {
            toast.error('Digite um termo ou escolhe um gênero pra buscar.');
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            let albums = await searchAlbums(term, { limit: 48 });

            if (genre) {
                albums = albums.filter(
                    (a) => a.genre && a.genre.toLowerCase().includes(genre.toLowerCase()),
                );
            }

            if (decade) {
                const start = Number(decade);
                albums = albums.filter((a) => {
                    const year = getYear(a.releaseDate);
                    if (!year) return false;
                    return decade === '1960' ? year < 1970 : year >= start && year < start + 10;
                });
            }

            // busca a média da comunidade de cada álbum, pra dar suporte à
            // ordenação por "nota" / "mais avaliados"
            const withStats = await Promise.all(
                albums.map(async (a) => {
                    const stats = await getAlbumStats(a.id).catch(() => null);
                    return {
                        ...a,
                        communityAvg: stats?.average || 0,
                        communityCount: stats?.count || 0,
                    };
                }),
            );

            setResults(sortResults(withStats, sortBy));
        } catch (err) {
            toast.error('Não consegui buscar agora. Tenta de novo.');
        } finally {
            setLoading(false);
        }
    }

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

    function handleSortChange(value) {
        setSortBy(value);
        setResults((prev) => sortResults(prev, value));
    }

    return (
        <div className={styles.page}>
            <Link href="/" className={styles.backLink}>
                <ArrowLeft size={16} /> voltar
            </Link>

            <div className={styles.header}>
                <h1 className={styles.title}>
                    <BookOpen
                        size={22}
                        style={{ display: 'inline', verticalAlign: '-4px', marginRight: 8 }}
                    />
                    Busca Avançada
                </h1>
                <p className={styles.sub}>
                    Filtra por gênero, década e nota da comunidade — o catálogo completo, do seu
                    jeito.
                </p>
            </div>

            <div className={styles.filtersBar}>
                <Input
                    className={styles.searchInput}
                    size="large"
                    placeholder="Nome do álbum ou artista (opcional se escolher um gênero)…"
                    prefix={<Search size={16} color="#6f6860" />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPressEnter={handleSearch}
                />
                <Select
                    className={styles.select}
                    size="large"
                    placeholder="Gênero"
                    allowClear
                    value={genre}
                    onChange={setGenre}
                    options={GENRES.map((g) => ({ value: g, label: g }))}
                />
                <Select
                    className={styles.select}
                    size="large"
                    placeholder="Década"
                    allowClear
                    value={decade}
                    onChange={setDecade}
                    options={DECADES}
                />
                <Select
                    className={styles.select}
                    size="large"
                    value={sortBy}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                />
                <button type="button" className={styles.searchBtn} onClick={handleSearch}>
                    Buscar
                </button>
            </div>

            <div className={styles.section}>
                {loading ? (
                    <div className={styles.loadingRow}>
                        <Spin size="large" />
                    </div>
                ) : !searched ? (
                    <div className={styles.emptyState}>
                        Escolhe um gênero, uma década, ou digita um nome — e clica em "Buscar".
                    </div>
                ) : results.length === 0 ? (
                    <div className={styles.emptyState}>
                        Nada encontrado com esses filtros. Tenta ajustar.
                    </div>
                ) : (
                    <>
                        <div
                            className={styles.resultsHead}
                            style={{ padding: 0, margin: '0 0 16px' }}>
                            <span className={styles.resultsCount}>{results.length} resultados</span>
                        </div>
                        <div className={styles.grid}>
                            {results.map((album) => (
                                <Link
                                    key={album.id}
                                    href={`/album/${album.id}`}
                                    className={styles.card}>
                                    {album.artwork ? (
                                        <img
                                            src={album.artwork}
                                            alt={album.title}
                                            className={styles.cover}
                                        />
                                    ) : (
                                        <div className={styles.cover} />
                                    )}
                                    <div className={styles.cardTitle}>{album.title}</div>
                                    <div className={styles.cardArtist}>{album.artist}</div>
                                    <div className={styles.cardMeta}>
                                        {album.genre && (
                                            <span className={styles.genreBadge}>{album.genre}</span>
                                        )}
                                        {getYear(album.releaseDate) && (
                                            <span>{getYear(album.releaseDate)}</span>
                                        )}
                                        {album.communityCount > 0 && (
                                            <span className={styles.communityRating}>
                                                ★ {album.communityAvg.toFixed(1)} (
                                                {album.communityCount})
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
