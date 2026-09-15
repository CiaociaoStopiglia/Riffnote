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
import { listTopRatedAlbums, getAlbumStats } from '../lib/ratings';
import { searchDiscogsAlbums, DECADES, GENRES, STYLES, COUNTRIES } from '../lib/discogs';
import AlbumCard from '../components/AlbumCard';
import TrackResultRow from '../components/TrackResultRow';
import styles from './page.module.css';

// Gênero/década/ordenação dos filtros avançados (pool iTunes + nota da
// comunidade Riffnote) — vocabulário próprio, diferente do vocabulário
// oficial da Discogs usado no "Explorar por filtro" (GENRES/DECADES acima).
const ADV_GENRES = [
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

const ADV_DECADES = [
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

        return () => {
            cancelled = true;
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

    // --- filtros avançados (pool iTunes + nota da comunidade Riffnote) ---
    const [advQuery, setAdvQuery] = useState('');
    const [advGenre, setAdvGenre] = useState(null);
    const [advDecade, setAdvDecade] = useState(null);
    const [sortBy, setSortBy] = useState('relevancia');

    const [advFilteredResults, setAdvFilteredResults] = useState(null); // null = modo padrão (sem filtro ativo)
    const [advFiltering, setAdvFiltering] = useState(false);

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

    async function handleApplyAdvFilters() {
        const term = advQuery.trim();

        if (!term && !advGenre && !advDecade) {
            toast.error('Digite algo, ou escolhe pelo menos um filtro (gênero/década).');
            return;
        }

        setAdvFiltering(true);
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
            if (advGenre) {
                pool = pool.filter(
                    (a) => a.genre && a.genre.toLowerCase().includes(advGenre.toLowerCase()),
                );
            }

            // filtro de década
            if (advDecade) {
                const start = Number(advDecade);
                pool = pool.filter((a) => {
                    const year = getYear(a.releaseDate);
                    if (!year) return false;
                    return advDecade === '1960' ? year < 1970 : year >= start && year < start + 10;
                });
            }

            if (pool.length === 0) {
                toast('Nada encontrado com esses filtros. Tenta ajustar.');
                setAdvFilteredResults([]);
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

            setAdvFilteredResults(sortResults(withStats, sortBy));
        } catch (err) {
            toast.error('Não consegui aplicar os filtros agora. Tenta de novo.');
        } finally {
            setAdvFiltering(false);
        }
    }

    function handleSortChange(value) {
        setSortBy(value);
        if (advFilteredResults) setAdvFilteredResults((prev) => sortResults(prev, value));
    }

    function clearAdvFilters() {
        setAdvQuery('');
        setAdvGenre(null);
        setAdvDecade(null);
        setSortBy('relevancia');
        setAdvFilteredResults(null);
    }

    const showingAdvFilters = advFilteredResults !== null;

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

            <div className={styles.filtersBar}>
                <Input
                    className={styles.searchInputAdv}
                    size="large"
                    placeholder="Nome do álbum ou artista (opcional)…"
                    prefix={<Search size={16} color="#6f6860" />}
                    value={advQuery}
                    onChange={(e) => setAdvQuery(e.target.value)}
                    onPressEnter={handleApplyAdvFilters}
                />
                <Select
                    className={styles.selectAdv}
                    size="large"
                    placeholder="Gênero"
                    allowClear
                    value={advGenre}
                    onChange={setAdvGenre}
                    options={ADV_GENRES.map((g) => ({ value: g, label: g }))}
                />
                <Select
                    className={styles.selectAdv}
                    size="large"
                    placeholder="Década"
                    allowClear
                    value={advDecade}
                    onChange={setAdvDecade}
                    options={ADV_DECADES}
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
                    onClick={handleApplyAdvFilters}
                    disabled={advFiltering}>
                    <SlidersHorizontal size={15} />
                    {advFiltering ? 'Filtrando…' : 'Aplicar filtros'}
                </button>
                {showingAdvFilters && (
                    <button type="button" className={styles.clearAdvBtn} onClick={clearAdvFilters}>
                        <X size={14} /> limpar
                    </button>
                )}
            </div>

            {showingAdvFilters ? (
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <h2 className={styles.sectionTitle}>Resultados filtrados</h2>
                        <span className={styles.sectionNote}>{advFilteredResults.length} álbuns</span>
                    </div>

                    {advFiltering ? (
                        <div className={styles.loadingRow}>
                            <Spin /> <span>aplicando filtros…</span>
                        </div>
                    ) : advFilteredResults.length === 0 ? (
                        <div className={styles.emptyState}>
                            Nada encontrado com esses filtros. Tenta ajustar.
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {advFilteredResults.map((album) => (
                                <AlbumCard
                                    key={album.id}
                                    album={album}
                                    average={album.communityAvg || undefined}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ) : showingSearch ? (
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
