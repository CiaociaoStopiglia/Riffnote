// src/app/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
    fetchNewReleases,
    fetchTopAlbums,
    searchAlbums,
    searchTracks,
    searchArtistDiscography,
} from '../lib/musicApi';
import { listTopRatedAlbums } from '../lib/ratings';
import { searchDiscogsAlbums, DECADES, GENRES, STYLES, COUNTRIES } from '../lib/discogs';
import AlbumCard from '../components/AlbumCard';
import TrackResultRow from '../components/TrackResultRow';
import styles from './page.module.css';

export default function AlbunsPage() {
    const router = useRouter();

    const [newReleases, setNewReleases] = useState([]);
    const [loadingNew, setLoadingNew] = useState(true);
    const [newError, setNewError] = useState(false);

    const [mostPlayed, setMostPlayed] = useState([]);
    const [loadingMostPlayed, setLoadingMostPlayed] = useState(true);

    const [topRated, setTopRated] = useState([]);
    const [loadingTopRated, setLoadingTopRated] = useState(true);

    // --- busca principal (álbuns, faixas e discografia completa) ---
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [albumResults, setAlbumResults] = useState(null); // null = sem busca ativa
    const [trackResults, setTrackResults] = useState([]);
    const [artistDiscography, setArtistDiscography] = useState(null);

    // --- explorar por filtro (Discogs: década, gênero, país, style) ---
    const [decade, setDecade] = useState(null);
    const [genre, setGenre] = useState(null);
    const [country, setCountry] = useState(null);
    const [style, setStyle] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [filterResults, setFilterResults] = useState([]);
    const [filterLoading, setFilterLoading] = useState(false);
    const [filterLoadingMore, setFilterLoadingMore] = useState(false);
    const [filterPage, setFilterPage] = useState(1);
    const [filterHasMore, setFilterHasMore] = useState(false);
    const [filterErrored, setFilterErrored] = useState(false);

    const hasAnyFilter = Boolean(decade || genre || country || style || filterQuery.trim());

    useEffect(() => {
        if (!hasAnyFilter) {
            setFilterResults([]);
            return;
        }

        let cancelled = false;
        setFilterLoading(true);
        setFilterErrored(false);

        // Debounce: sem isso, cada tecla digitada em "Buscar dentro do
        // recorte" (ou troca rápida de filtro) disparava uma chamada nova pra
        // Discogs. O token tem limite de 60 req/min — estourava rapidinho e
        // toda busca seguinte caía no erro genérico até o limite resetar.
        const timer = setTimeout(() => {
            searchDiscogsAlbums({
                decade,
                genre,
                style,
                country,
                q: filterQuery.trim() || undefined,
                page: 1,
            })
                .then((data) => {
                    if (cancelled) return;
                    setFilterResults(data.results);
                    setFilterPage(1);
                    setFilterHasMore(data.page < data.pages);
                })
                .catch(() => {
                    if (cancelled) return;
                    setFilterErrored(true);
                    toast.error('Não consegui buscar na Discogs agora.');
                })
                .finally(() => {
                    if (!cancelled) setFilterLoading(false);
                });
        }, 450);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [decade, genre, country, style, filterQuery, hasAnyFilter]);

    async function handleLoadMoreFiltered() {
        setFilterLoadingMore(true);
        try {
            const nextPage = filterPage + 1;
            const data = await searchDiscogsAlbums({
                decade,
                genre,
                style,
                country,
                q: filterQuery.trim() || undefined,
                page: nextPage,
            });
            setFilterResults((prev) => [...prev, ...data.results]);
            setFilterPage(data.page);
            setFilterHasMore(data.page < data.pages);
        } catch (err) {
            toast.error('Não consegui carregar mais resultados.');
        } finally {
            setFilterLoadingMore(false);
        }
    }

    function clearAlbumFilters() {
        setDecade(null);
        setGenre(null);
        setCountry(null);
        setStyle(null);
        setFilterQuery('');
    }

    // A Discogs não tem página própria no Riffnote pra avaliar — antes de abrir
    // o álbum, procuramos o mesmo disco no catálogo iTunes (o que `/album/[id]`
    // usa) por artista + título, pra cair na página de avaliação de verdade.
    const [resolvingAlbumId, setResolvingAlbumId] = useState(null);

    function normalizeForMatch(text) {
        return (text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '') // acentos
            .replace(/[^a-z0-9]+/g, ' ') // pontuação/apóstrofos viram espaço
            .trim();
    }

    // Tira sufixos de edição ("(Deluxe Edition)", "[Remastered]"...) que a
    // Discogs e o iTunes nem sempre têm em conjunto, senão o título nunca bate.
    function stripEditionSuffix(title) {
        return (title || '')
            .replace(
                /\s*[([][^)\]]*(deluxe|remaster|edition|version|bonus|expanded|anniversary)[^)\]]*[)\]]\s*/gi,
                '',
            )
            .trim();
    }

    async function handleOpenDiscogsAlbum(discogsAlbum) {
        if (resolvingAlbumId) return;

        setResolvingAlbumId(discogsAlbum.id);
        try {
            const cleanTitle = stripEditionSuffix(discogsAlbum.title);
            const matches = await searchAlbums(cleanTitle, { limit: 10 });

            if (matches.length === 0) {
                toast.error('Esse álbum ainda não está no nosso catálogo pra avaliar.');
                return;
            }

            const artistNorm = normalizeForMatch(discogsAlbum.artist);
            const titleNorm = normalizeForMatch(cleanTitle);

            // Exige o artista bater — só o título é frágil demais (compilações,
            // covers, "best of" batem por título e não podem passar aqui).
            const candidates = matches
                .map((m) => {
                    const matchArtistNorm = normalizeForMatch(m.artist);
                    const matchTitleNorm = normalizeForMatch(stripEditionSuffix(m.title));
                    const artistMatches =
                        Boolean(artistNorm) &&
                        (matchArtistNorm === artistNorm ||
                            matchArtistNorm.includes(artistNorm) ||
                            artistNorm.includes(matchArtistNorm));

                    let score = 0;
                    if (matchTitleNorm === titleNorm) score += 3;
                    else if (matchTitleNorm.includes(titleNorm) || titleNorm.includes(matchTitleNorm))
                        score += 1;

                    return { match: m, artistMatches, score };
                })
                .filter((c) => c.artistMatches)
                .sort((a, b) => b.score - a.score);

            if (candidates.length === 0 || candidates[0].score === 0) {
                toast.error('Esse álbum ainda não está no nosso catálogo pra avaliar.');
                return;
            }

            router.push(`/album/${candidates[0].match.id}`);
        } catch (err) {
            toast.error('Não consegui abrir esse álbum agora. Tenta de novo.');
        } finally {
            setResolvingAlbumId(null);
        }
    }

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

    async function handleSearch() {
        const term = query.trim();
        if (!term) {
            toast.error('Digite o nome de um álbum, artista ou música.');
            return;
        }

        setSearching(true);
        try {
            const [albums, tracks, discography] = await Promise.all([
                searchAlbums(term, { limit: 16 }),
                searchTracks(term, { limit: 8 }),
                searchArtistDiscography(term).catch(() => null),
            ]);

            if (albums.length === 0 && tracks.length === 0 && !discography) {
                toast(`Nada encontrado para "${term}".`);
            }

            setAlbumResults(albums);
            setTrackResults(tracks);
            setArtistDiscography(discography);
        } catch (err) {
            toast.error('Não consegui completar a busca. Tenta de novo.');
        } finally {
            setSearching(false);
        }
    }

    function clearSearch() {
        setAlbumResults(null);
        setTrackResults([]);
        setArtistDiscography(null);
        setQuery('');
    }

    const showingSearch = albumResults !== null;

    return (
        <div className={styles.page}>
            <Link href="/" className={styles.backLink}>
                <ArrowLeft size={16} /> voltar
            </Link>

            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Álbuns</h1>
                <p className={styles.pageSub}>Descubra, explore e avalie o que está tocando.</p>
            </div>

            <div className={styles.searchWrap}>
                <Input
                    size="large"
                    placeholder="Busque um álbum, artista ou música…"
                    prefix={<Search size={16} color="#6f6860" />}
                    suffix={searching ? <Spin size="small" /> : null}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPressEnter={handleSearch}
                />
            </div>

            <section className={styles.section}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>
                        <SlidersHorizontal size={18} />
                        Explorar por filtro
                    </h2>
                    {hasAnyFilter && (
                        <button type="button" className={styles.sectionLink} onClick={clearAlbumFilters}>
                            limpar <X size={13} />
                        </button>
                    )}
                </div>

                <div className={styles.exploreFiltersBar}>
                    <Select
                        allowClear
                        placeholder="Década"
                        options={DECADES}
                        value={decade}
                        onChange={setDecade}
                        className={styles.filterSelect}
                    />
                    <Select
                        allowClear
                        showSearch
                        placeholder="Gênero"
                        options={GENRES}
                        value={genre}
                        onChange={setGenre}
                        className={styles.filterSelect}
                        optionFilterProp="label"
                    />
                    <Select
                        allowClear
                        showSearch
                        placeholder="País"
                        options={COUNTRIES}
                        value={country}
                        onChange={setCountry}
                        className={styles.filterSelect}
                        optionFilterProp="label"
                    />
                    <Select
                        allowClear
                        showSearch
                        placeholder="Style"
                        options={STYLES}
                        value={style}
                        onChange={setStyle}
                        className={styles.filterSelect}
                        optionFilterProp="label"
                    />
                    <Input
                        placeholder="Buscar dentro do recorte…"
                        prefix={<Search size={14} color="#6f6860" />}
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className={styles.filterSearchInput}
                        allowClear
                    />
                </div>

                {!hasAnyFilter ? (
                    <div className={styles.emptyState}>
                        Escolhe pelo menos um filtro (ou busca um termo) pra explorar o catálogo por
                        década, gênero, país e style.
                    </div>
                ) : filterLoading ? (
                    <div className={styles.loadingRow}>
                        <Spin /> <span>buscando na Discogs…</span>
                    </div>
                ) : filterErrored ? (
                    <div className={styles.emptyState}>
                        Não consegui buscar agora. Tenta de novo em instantes.
                    </div>
                ) : filterResults.length === 0 ? (
                    <div className={styles.emptyState}>
                        Nada encontrado com esses filtros. Tenta afrouxar um pouco.
                    </div>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {filterResults.map((album) => (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    onClick={handleOpenDiscogsAlbum}
                                    loading={resolvingAlbumId === album.id}
                                    badge={[album.year, album.country].filter(Boolean).join(' · ')}
                                />
                            ))}
                        </div>

                        {filterHasMore && (
                            <div className={styles.loadMoreRow}>
                                <button
                                    type="button"
                                    className={styles.loadMoreBtn}
                                    onClick={handleLoadMoreFiltered}
                                    disabled={filterLoadingMore}>
                                    {filterLoadingMore ? 'Carregando…' : 'Carregar mais 100'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {showingSearch ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>Resultados para "{query}"</h2>
                        <button type="button" className={styles.sectionLink} onClick={clearSearch}>
                            limpar <X size={13} />
                        </button>
                    </div>

                    {albumResults.length === 0 && trackResults.length === 0 && !artistDiscography ? (
                        <div className={styles.emptyState}>Nada encontrado. Tenta outro termo.</div>
                    ) : (
                        <>
                            {/* Seção Nova: Discografia Completa */}
                            {artistDiscography && (
                                <div className={styles.grid} style={{ marginBottom: 32 }}>
                                    <div className={styles.sectionHead} style={{ gridColumn: '1/-1' }}>
                                        <h3 className={styles.sectionTitle}>
                                            Discografia completa — {artistDiscography.artist?.name}
                                            <span className={styles.sectionNote}>
                                                {' '}
                                                ({artistDiscography.albums.length} álbuns)
                                            </span>
                                        </h3>
                                    </div>
                                    {artistDiscography.albums.map((album) => (
                                        <AlbumCard key={album.id} album={album} />
                                    ))}
                                </div>
                            )}

                            {/* Seção Original: Álbuns Livres */}
                            {albumResults.length > 0 && (
                                <div className={styles.grid}>
                                    {albumResults.map((album) => (
                                        <AlbumCard key={album.id} album={album} />
                                    ))}
                                </div>
                            )}

                            {/* Seção Original: Faixas */}
                            {trackResults.length > 0 && (
                                <div className={styles.trackResultsBlock}>
                                    <span className={styles.trackResultsLabel}>Músicas</span>
                                    <div className={styles.trackResultsList}>
                                        {trackResults.map((track) => (
                                            <TrackResultRow key={track.trackId} track={track} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
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
