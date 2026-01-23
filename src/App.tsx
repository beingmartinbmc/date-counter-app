import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { format, parseISO, differenceInCalendarDays, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { eventsApi, mapBackendEventToFrontend, mapFrontendEventToBackend, commentsApi, Comment } from './services/api';
import ScreenEffects, { EffectType } from './components/ScreenEffects';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Label as LabelIcon,
  CalendarToday as CalendarTodayIcon,
  VisibilityOff as VisibilityOffIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  AutoAwesome as AutoAwesomeIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Send as SendIcon
} from '@mui/icons-material';

interface Event {
  id: string;
  title: string;
  date: string;
  labels: string[];
  comments: string;
  reaction?: string;
}

type Language = 'en' | 'zh';
type Theme = 'light' | 'dark';

const translations: Record<
  Language,
  {
    languageSelectLabel: string;
    hero: { title: string; subtitle: string };
    empty: { title: string; subtitle: string; button: string };
    addRow: { button: string };
    dialog: {
      addTitle: string;
      editTitle: string;
      eventName: string;
      dateLabel: string;
      addLabel: string;
      addLabelButton: string;
      commentsLabel: string;
      cancel: string;
      add: string;
      update: string;
    };
    meta: { today: string; daysLeft: string; daysAgo: string; invalidDate: string };
  }
> = {
  en: {
    languageSelectLabel: 'Choose language',
    hero: { title: 'Couple countdown · Shared view', subtitle: 'Capture every heartfelt milestone' },
    empty: {
      title: 'No events yet',
      subtitle: 'Tap the button below to add your first day',
      button: 'Add Event'
    },
    addRow: { button: 'Add new event' },
    dialog: {
      addTitle: 'Add new event',
      editTitle: 'Edit event',
      eventName: 'Event title',
      dateLabel: 'Date',
      addLabel: 'Add label',
      addLabelButton: 'Add',
      commentsLabel: 'Notes',
      cancel: 'Cancel',
      add: 'Add',
      update: 'Update'
    },
    meta: { today: 'Today', daysLeft: 'Days left', daysAgo: 'Days ago', invalidDate: 'Invalid date' }
  },
  zh: {
    languageSelectLabel: '选择语言',
    hero: { title: '绑定情侣 · 双方可见', subtitle: '记录你们的每一个心动瞬间' },
    empty: {
      title: '暂无事件',
      subtitle: '点击下方按钮添加你的第一个日子',
      button: '添加事件'
    },
    addRow: { button: '添加新事件' },
    dialog: {
      addTitle: '添加新事件',
      editTitle: '编辑事件',
      eventName: '事件标题',
      dateLabel: '日期',
      addLabel: '添加标签',
      addLabelButton: '添加',
      commentsLabel: '备注',
      cancel: '取消',
      add: '添加',
      update: '更新'
    },
    meta: { today: '今天', daysLeft: '天后', daysAgo: '天前', invalidDate: '日期无效' }
  }
};

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [newEvent, setNewEvent] = useState<Omit<Event, 'id'>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    labels: [],
    comments: ''
  });

  const [currentLabel, setCurrentLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [now, setNow] = useState(new Date());
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('dateCounterTheme');
    return (saved as Theme) || 'light';
  });
  const [reactionPickerOpen, setReactionPickerOpen] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [screenEffect, setScreenEffect] = useState<EffectType | null>(null);
  const [effectMenuOpen, setEffectMenuOpen] = useState(false);
  const [eventComments, setEventComments] = useState<Record<string, Comment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState<{ eventId: string; content: string; author: string }>({ eventId: '', content: '', author: '' });

  const t = translations[language];
  const locale = language === 'zh' ? zhCN : undefined;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('dateCounterTheme', theme);
  }, [theme]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const backendEvents = await eventsApi.getAll({ limit: 100, sortBy: 'eventDate', sortOrder: 'asc' });
      const frontendEvents = backendEvents.map(mapBackendEventToFrontend);
      setEvents(frontendEvents);
      localStorage.setItem('dateCounterEvents', JSON.stringify(frontendEvents));
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events. Please try again.');
      const saved = localStorage.getItem('dateCounterEvents');
      if (saved) {
        setEvents(JSON.parse(saved));
      }
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const fetchCommentsForEvent = async (eventId: string) => {
    try {
      const comments = await commentsApi.getByEvent(eventId, { limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      setEventComments(prev => ({ ...prev, [eventId]: comments }));
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const toggleComments = (eventId: string) => {
    const newExpanded = new Set(expandedComments);
    if (expandedComments.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
      if (!eventComments[eventId]) {
        fetchCommentsForEvent(eventId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (eventId: string) => {
    if (!newComment.content.trim()) return;
    
    try {
      await commentsApi.create({
        eventId,
        content: newComment.content,
        author: newComment.author.trim() || 'Anonymous',
      });
      
      // Refetch comments to get the latest from backend
      await fetchCommentsForEvent(eventId);
      
      setNewComment({ eventId: '', content: '', author: '' });
      showSnackbar('Comment added successfully');
    } catch (err) {
      console.error('Failed to add comment:', err);
      showSnackbar('Failed to add comment. Please try again.');
    }
  };

  const triggerEffect = (effect: EffectType) => {
    setScreenEffect(effect);
    setTimeout(() => setScreenEffect(null), 4000);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingId(null);
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      labels: [],
      comments: ''
    });
    setCurrentLabel('');
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;

    try {
      if (editingId) {
        const backendData = mapFrontendEventToBackend(newEvent);
        const updatedEvent = await eventsApi.update(editingId, backendData);
        const frontendEvent = mapBackendEventToFrontend(updatedEvent);
        const updatedEvents = events.map((event) => (event.id === editingId ? frontendEvent : event));
        setEvents(updatedEvents);
        localStorage.setItem('dateCounterEvents', JSON.stringify(updatedEvents));
        showSnackbar('Event updated successfully');
      } else {
        const backendData = mapFrontendEventToBackend(newEvent);
        const createdEvent = await eventsApi.create(backendData);
        const frontendEvent = mapBackendEventToFrontend(createdEvent);
        const newEvents = [...events, frontendEvent];
        setEvents(newEvents);
        localStorage.setItem('dateCounterEvents', JSON.stringify(newEvents));
        showSnackbar('Event created successfully');
        triggerEffect('celebration');
      }

      handleDialogClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      showSnackbar('Failed to save event. Please try again.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await eventsApi.delete(id);
      const filteredEvents = events.filter((event) => event.id !== id);
      setEvents(filteredEvents);
      localStorage.setItem('dateCounterEvents', JSON.stringify(filteredEvents));
      showSnackbar('Event deleted successfully');
    } catch (err) {
      console.error('Failed to delete event:', err);
      showSnackbar('Failed to delete event. Please try again.');
    }
  };

  const handleEditEvent = (event: Event) => {
    setNewEvent({
      title: event.title,
      date: event.date,
      labels: [...event.labels],
      comments: event.comments
    });
    setEditingId(event.id);
    setOpenDialog(true);
  };

  const addLabel = () => {
    if (currentLabel.trim() && !newEvent.labels.includes(currentLabel.trim())) {
      setNewEvent((prev) => ({
        ...prev,
        labels: [...prev.labels, currentLabel.trim()]
      }));
      setCurrentLabel('');
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setNewEvent((prev) => ({
      ...prev,
      labels: prev.labels.filter((label) => label !== labelToRemove)
    }));
  };

  const palette = useMemo(
    () => [
      { background: 'linear-gradient(135deg, #7e8bff 0%, #a3b5ff 100%)', shadow: '0 20px 30px rgba(126,139,255,0.35)' },
      { background: 'linear-gradient(135deg, #ffb774 0%, #ffcf9d 100%)', shadow: '0 20px 35px rgba(255,183,116,0.35)' },
      { background: 'linear-gradient(135deg, #5dd6c0 0%, #7fe3d7 100%)', shadow: '0 20px 30px rgba(93,214,192,0.3)' },
      { background: 'linear-gradient(135deg, #ff82b1 0%, #ffb0ce 100%)', shadow: '0 20px 35px rgba(255,130,177,0.3)' }
    ],
    []
  );

  const computeEventMeta = useCallback((dateString: string) => {
    try {
      const eventDate = parseISO(dateString);
      if (Number.isNaN(eventDate.getTime())) {
        throw new Error('Invalid date');
      }
      const diff = differenceInCalendarDays(eventDate, startOfDay(now));
      const absolute = Math.abs(diff);

      // Calculate detailed time difference
      const totalMs = eventDate.getTime() - now.getTime();
      const totalSeconds = Math.floor(Math.abs(totalMs) / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      return {
        diff,
        absolute,
        eventDate,
        days,
        hours,
        minutes,
        seconds,
        isPast: totalMs < 0
      };
    } catch (error) {
      return {
        diff: 0,
        absolute: 0,
        eventDate: null,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPast: false
      };
    }
  }, [now]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const diffA = computeEventMeta(a.date).diff;
      const diffB = computeEventMeta(b.date).diff;
      return diffA - diffB;
    });
  }, [events, computeEventMeta]);

  const timeString = format(now, 'HH:mm');
  const dateString = format(
    now,
    language === 'zh' ? 'MM月dd日 EEEE' : 'MMMM dd, EEEE',
    locale ? { locale } : undefined
  );
  const clockDate = format(
    now,
    language === 'zh' ? 'MM月dd日 EEEE' : 'MMMM do, EEEE',
    locale ? { locale } : undefined
  );
  const digits = timeString.split('');

  const handleLanguageChange = (event: SelectChangeEvent<Language>) => {
    setLanguage(event.target.value as Language);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleReactionSelect = async (eventId: string, reaction: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    try {
      const backendData = {
        metadata: {
          labels: event.labels,
          comments: event.comments,
          reaction,
        },
      };
      await eventsApi.update(eventId, backendData);
      const updatedEvents = events.map((e) => (e.id === eventId ? { ...e, reaction } : e));
      setEvents(updatedEvents);
      localStorage.setItem('dateCounterEvents', JSON.stringify(updatedEvents));
      setReactionPickerOpen(null);
      
      if (reaction === '❤️' || reaction === '😍') {
        triggerEffect('hearts');
      } else if (reaction === '🥳' || reaction === '🎉') {
        triggerEffect('confetti');
      } else if (reaction === '🔥') {
        triggerEffect('fireworks');
      }
    } catch (err) {
      console.error('Failed to update reaction:', err);
      showSnackbar('Failed to add reaction. Please try again.');
    }
  };

  const reactions = ['❤️', '😍', '🥳', '🎉', '🔥', '👍', '😊', '💯'];

  const effects: { name: string; effect: EffectType; icon: string }[] = [
    { name: 'Confetti', effect: 'confetti', icon: '🎊' },
    { name: 'Hearts', effect: 'hearts', icon: '💕' },
    { name: 'Balloons', effect: 'balloons', icon: '🎈' },
    { name: 'Fireworks', effect: 'fireworks', icon: '✨' },
    { name: 'Celebration', effect: 'celebration', icon: '🎉' },
  ];

  return (
    <Box className="app-background" data-theme={theme}>
      <Container maxWidth="sm" className="app-root">
        <Box className="phone-shell">
          <Box className="app-header">
            <Typography variant="subtitle2" color="text.secondary">
              {dateString}
            </Typography>
            <Box className="header-actions">
              <IconButton size="small" onClick={toggleTheme} className="theme-toggle">
                {theme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={() => setEffectMenuOpen(!effectMenuOpen)} 
                className="theme-toggle"
              >
                <AutoAwesomeIcon fontSize="small" />
              </IconButton>
              <FormControl size="small" className="language-select" variant="outlined">
                <Select
                  value={language}
                  onChange={handleLanguageChange}
                  inputProps={{ 'aria-label': t.languageSelectLabel }}
                >
                  <MenuItem value="zh">中文</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box className="clock-wrapper">
            <Typography variant="subtitle1" className="clock-date">
              {clockDate}
            </Typography>
            <Box className="digital-clock">
              {digits.map((digit, index) => (
                <Box
                  key={`${digit}-${index}`}
                  className={`flip-digit ${digit === ':' ? 'colon' : ''}`}
                >
                  {digit}
                </Box>
              ))}
            </Box>
          </Box>

          {heroVisible && (
            <Paper elevation={0} className="hero-card">
              <Box className="hero-text">
                <Typography variant="subtitle1">{t.hero.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.hero.subtitle}
                </Typography>
              </Box>
              <IconButton size="small" className="ghost-button" onClick={() => setHeroVisible(false)}>
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            </Paper>
          )}

          <Box className="event-list" component="section">
            {loading ? (
              <Paper elevation={0} className="empty-state">
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading events...
                </Typography>
              </Paper>
            ) : error ? (
              <Paper elevation={0} className="empty-state">
                <Typography variant="h6" color="error">Error</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {error}
                </Typography>
                <Button
                  variant="contained"
                  onClick={fetchEvents}
                  size="small"
                >
                  Retry
                </Button>
              </Paper>
            ) : sortedEvents.length === 0 ? (
              <Paper elevation={0} className="empty-state">
                <Typography variant="h6">{t.empty.title}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t.empty.subtitle}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenDialog(true)}
                  size="small"
                >
                  {t.empty.button}
                </Button>
              </Paper>
            ) : (
              sortedEvents.map((event, index) => {
                const meta = computeEventMeta(event.date);
                const colors = palette[index % palette.length];
                const formattedEventDate = meta.eventDate
                  ? format(
                      meta.eventDate,
                      language === 'zh' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy',
                      locale ? { locale } : undefined
                    )
                  : t.meta.invalidDate;
                const daysLabel = meta.eventDate
                  ? meta.diff === 0
                    ? t.meta.today
                    : meta.diff > 0
                    ? t.meta.daysLeft
                    : t.meta.daysAgo
                  : t.meta.invalidDate;

                return (
                  <Paper
                    key={event.id}
                    elevation={0}
                    className="event-card"
                    style={{ background: colors.background, boxShadow: colors.shadow }}
                  >
                    <Box className="event-card-header">
                      <Box>
                        <Box className="event-title-row">
                          <Typography className="event-title">{event.title}</Typography>
                          <span className={`event-badge ${meta.diff === 0 ? 'badge-today' : meta.diff > 0 ? 'badge-upcoming' : 'badge-past'}`}>
                            {meta.diff === 0 ? '📍' : meta.diff > 0 ? '⏳' : '✓'}
                          </span>
                        </Box>
                        <Typography className="event-date">{formattedEventDate}</Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => handleEditEvent(event)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteEvent(event.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box className="event-countdown-unified">
                      <Box className="countdown-segments">
                        <Box className="countdown-segment">
                          <Typography className="countdown-value">{meta.days}</Typography>
                          <Typography className="countdown-label">days</Typography>
                        </Box>
                        <Typography className="countdown-separator">:</Typography>
                        <Box className="countdown-segment">
                          <Typography className="countdown-value">{String(meta.hours).padStart(2, '0')}</Typography>
                          <Typography className="countdown-label">hours</Typography>
                        </Box>
                        <Typography className="countdown-separator">:</Typography>
                        <Box className="countdown-segment">
                          <Typography className="countdown-value">{String(meta.minutes).padStart(2, '0')}</Typography>
                          <Typography className="countdown-label">min</Typography>
                        </Box>
                        <Typography className="countdown-separator">:</Typography>
                        <Box className="countdown-segment">
                          <Typography className="countdown-value">{String(meta.seconds).padStart(2, '0')}</Typography>
                          <Typography className="countdown-label">sec</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {event.labels.length > 0 && (
                      <Box className="event-labels">
                        {event.labels.map((label) => (
                          <Chip key={label} label={label} size="small" className="ghost-chip" />
                        ))}
                      </Box>
                    )}

                    {event.comments && (
                      <Typography variant="body2" className="event-comment">
                        {event.comments}
                      </Typography>
                    )}

                    <Box className="event-actions-row">
                      <Box className="event-reaction-section">
                        {event.reaction ? (
                          <Box className="event-reaction-display" onClick={() => setReactionPickerOpen(event.id)}>
                            <span className="reaction-emoji">{event.reaction}</span>
                          </Box>
                        ) : (
                          <IconButton 
                            size="small" 
                            className="add-reaction-btn"
                            onClick={() => setReactionPickerOpen(event.id)}
                          >
                            <EmojiEmotionsIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        {reactionPickerOpen === event.id && (
                          <Box className="reaction-picker">
                            {reactions.map(reaction => (
                              <button
                                key={reaction}
                                className="reaction-option"
                                onClick={() => handleReactionSelect(event.id, reaction)}
                              >
                                {reaction}
                              </button>
                            ))}
                          </Box>
                        )}
                      </Box>

                      <Button
                        size="small"
                        className="comments-toggle-btn"
                        startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
                        onClick={() => toggleComments(event.id)}
                      >
                        {eventComments[event.id]?.length || 0} Comments
                      </Button>
                    </Box>

                    {expandedComments.has(event.id) && (
                      <Box className="comments-section">
                        <Box className="add-comment-box">
                          <TextField
                            size="small"
                            placeholder="Your name (optional)"
                            value={newComment.eventId === event.id ? newComment.author : ''}
                            onChange={(e) => setNewComment({ ...newComment, eventId: event.id, author: e.target.value })}
                            className="comment-author-input"
                          />
                          <TextField
                            size="small"
                            placeholder="Write a comment..."
                            value={newComment.eventId === event.id ? newComment.content : ''}
                            onChange={(e) => setNewComment({ ...newComment, eventId: event.id, content: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(event.id);
                              }
                            }}
                            multiline
                            maxRows={3}
                            fullWidth
                            className="comment-input"
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleAddComment(event.id)}
                            disabled={!newComment.content.trim() || newComment.eventId !== event.id}
                            className="send-comment-btn"
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Box className="comments-list">
                          {eventComments[event.id]?.map((comment) => (
                            <Box key={comment._id} className="comment-item">
                              <Box className="comment-header">
                                <Typography className="comment-author">{comment.author}</Typography>
                                <Typography className="comment-time">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Typography className="comment-content">{comment.content}</Typography>
                            </Box>
                          ))}
                          {(!eventComments[event.id] || eventComments[event.id].length === 0) && (
                            <Typography className="no-comments">No comments yet. Be the first to comment!</Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                );
              })
            )}
          </Box>

          <Box className="add-event-row">
            <Button
              fullWidth
              className="add-event-button"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              {t.addRow.button}
            </Button>
            <Avatar
              alt="Profile"
              src="https://i.pravatar.cc/150?img=68"
              className="profile-avatar"
            />
          </Box>

          <Box className="bottom-nav">
            <button className="nav-button active">
              <CalendarTodayIcon fontSize="small" />
            </button>
            <button className="nav-button" onClick={toggleTheme}>
              {theme === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </button>
            <button className="nav-button" onClick={() => setOpenDialog(true)}>
              <AddIcon fontSize="small" />
            </button>
          </Box>
        </Box>
      </Container>

      <ScreenEffects effect={screenEffect} onComplete={() => setScreenEffect(null)} />

      <Dialog open={effectMenuOpen} onClose={() => setEffectMenuOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Screen Effects</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, pt: 1 }}>
            {effects.map((effect) => (
              <Button
                key={effect.effect}
                variant="outlined"
                onClick={() => {
                  triggerEffect(effect.effect);
                  setEffectMenuOpen(false);
                }}
                sx={{
                  height: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  fontSize: '32px',
                }}
              >
                <span>{effect.icon}</span>
                <Typography variant="caption">{effect.name}</Typography>
              </Button>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? t.dialog.editTitle : t.dialog.addTitle}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t.dialog.eventName}
            fullWidth
            variant="outlined"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label={t.dialog.dateLabel}
            type="date"
            fullWidth
            variant="outlined"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" mb={1} gap={1}>
              <TextField
                label={t.dialog.addLabel}
                variant="outlined"
                size="small"
                value={currentLabel}
                onChange={(e) => setCurrentLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                fullWidth
              />
              <Button variant="outlined" startIcon={<LabelIcon />} onClick={addLabel}>
                {t.dialog.addLabelButton}
              </Button>
            </Box>
            <Box className="dialog-labels">
              {newEvent.labels.map((label) => (
                <Chip key={label} label={label} onDelete={() => removeLabel(label)} size="small" />
              ))}
            </Box>
          </Box>

          <TextField
            margin="dense"
            label={t.dialog.commentsLabel}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newEvent.comments}
            onChange={(e) => setNewEvent({ ...newEvent, comments: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>{t.dialog.cancel}</Button>
          <Button onClick={handleAddEvent} variant="contained" disabled={!newEvent.title || !newEvent.date}>
            {editingId ? t.dialog.update : t.dialog.add}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
