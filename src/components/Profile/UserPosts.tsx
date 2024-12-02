import React, { useEffect, useState } from 'react';
import { Post, User } from '../../models';
import axios from 'axios';
import config from '../../config';
import { Loader2, FileText } from 'lucide-react';
import { PostsFilterBar, Pagination, PostCard, ErrorModal } from '..';
import { useTranslation } from 'react-i18next';

interface FilterState {
    dateInterval?: {
        startDate: string;
        endDate: string;
    };
    searchQuery?: string;
    categoryIds?: number[];
}

interface UserPostsProps {
    user: User | null;
}

export const UserPosts: React.FC<UserPostsProps> = ({ user }) => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorDetails, setErrorDetails] = useState<{
        message: string;
        details?: string;
        code?: string;
    } | null>(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 6
    });
    const [sortBy, setSortBy] = useState('publishDate');
    const [filters, setFilters] = useState<FilterState>({});

    const fetchPosts = async (page: number, sort: string, currentFilters: FilterState) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.itemsPerPage.toString(),
                sort
            });

            if (currentFilters.dateInterval?.startDate) {
                params.append('startDate', currentFilters.dateInterval.startDate);
            }
            if (currentFilters.dateInterval?.endDate) {
                params.append('endDate', currentFilters.dateInterval.endDate);
            }
            if (currentFilters.categoryIds && currentFilters.categoryIds.length > 0) {
                params.append('categories', currentFilters.categoryIds.join(','));
            }

            const response = await axios.get(`${config.backendUrl}/posts/user/posts`, { params });
            setPosts(response.data.posts);
            setPagination(response.data.pagination);
        } catch (err) {
            setErrorDetails({
                message: t('userPosts.errors.loadFailed'),
                details: t('error.tryAgain'),
                code: 'POSTS_LOAD_ERROR'
            });
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts(pagination.currentPage, sortBy, filters);
    }, [pagination.currentPage, sortBy, filters]);

    const handleSortChange = (newSort: string) => {
        setSortBy(newSort);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleResetAll = () => {
        setSortBy('publishDate');
        setFilters({});
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleDeletePost = async (postId: number) => {
        try {
            await axios.delete(`${config.backendUrl}/posts/${postId}`);
            await fetchPosts(pagination.currentPage, sortBy, filters);
            const newTotalPages = Math.ceil((pagination.totalItems - 1) / pagination.itemsPerPage);
            if (pagination.currentPage > newTotalPages && newTotalPages > 0) {
                await fetchPosts(newTotalPages, sortBy, filters);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                setErrorDetails({
                    message: error.response?.data?.error || t('userPosts.errors.deleteFailed'),
                    details: t('error.tryAgain'),
                    code: 'POST_DELETE_ERROR'
                });
            } else {
                setErrorDetails({
                    message: t('userPosts.errors.deleteFailed'),
                    details: t('error.tryAgain'),
                    code: 'POST_DELETE_ERROR'
                });
            }
            setShowErrorModal(true);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    {t('userPosts.title')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {t('userPosts.subtitle')}
                </p>
            </div>

            <PostsFilterBar
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                onResetAll={handleResetAll}
                currentSort={sortBy}
                filters={filters}
            />

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUser={user}
                                onDelete={handleDeletePost}
                            />
                        ))}
                    </div>
                    {posts.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('userPosts.noPosts')}
                        </div>
                    )}
                    {posts.length > 0 && (
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            )}

            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                error={errorDetails || {
                    message: t('error.unknownError'),
                    details: t('error.tryAgain')
                }}
            />
        </div>
    );
};