'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectAuthReady, selectIsAuthenticated, clearAuth } from '../../redux/slices/authSlice';
import useIdleLogout from '../../hooks/useIdleLogout';
import s from "./SuperAdminShell.module.css";

// ── Section data ────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    items: [
      {
        id: 'dashboard', label: 'Dashboard', path: '/superadmin/dashboard',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
      },
    ],
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4 7.962 7.962 0 009 5.189V4.804z" />
      </svg>
    ),
    items: [
      {
        id: 'category-subcategory', label: 'Category / Sub-Category', path: '/superadmin/category-subcategory',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zm0 4a1 1 0 000 2h7a1 1 0 100-2H3zm0 4a1 1 0 000 2h4a1 1 0 100-2H3zm9 1a1 1 0 10-2 0v2.586l-.293-.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L12 14.586V12z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'tags', label: 'Tags', path: '/superadmin/tags',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'course-builder', label: 'Course Builder', path: '/superadmin/course-builder',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'certificate-template', label: 'Certificate Template', path: '/superadmin/certificate-template',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
      },
    ],
  },
  {
    id: 'organizations',
    label: 'Organizations',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      {
        id: 'organizations', label: 'Organizations', path: '/superadmin/organizations',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'assign-user', label: 'Assign User', path: '/superadmin/organization-user-assignment',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6z" /><path d="M8 11a6 6 0 00-6 6h12a6 6 0 00-6-6z" /><path d="M16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>,
      },
      {
        id: 'assign-course', label: 'Assign Course', path: '/superadmin/organization-course-assignment',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'assign-credit', label: 'Assign Credit', path: '/superadmin/organization-credit-assignment',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'industry-type', label: 'Industry Type', path: '/superadmin/industry-type',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'employees', label: 'User', path: '/superadmin/employees',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'manage-credit', label: 'Manage Credit', path: '/superadmin/credits',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>,
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      {
        id: 'orders', label: 'Orders', path: '/superadmin/payments/orders',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'invoices', label: 'Invoices', path: '/superadmin/payments/invoices',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
    items: [
      {
        id: 'users', label: 'User', path: '/superadmin/user',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'roles', label: 'Roles', path: '/superadmin/roles',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" /></svg>,
      },
      {
        id: 'assign-role', label: 'Assign Role', path: '/superadmin/role-permissions',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>,
      },
      {
        id: 'support-tickets', label: 'Support Tickets', path: '/superadmin/support-tickets',
        icon: <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>,
      },
    ],
  },
];

function getSectionForItem(itemId) {
  for (const sec of SECTIONS) {
    if (sec.items.some(i => i.id === itemId)) return sec;
  }
  return SECTIONS[0];
}

const Icon = {
  bell: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
};
export default function SuperAdminShell({ children, activeSection = 'dashboard' }) {
  const user          = useSelector(selectUser);
  const authReady     = useSelector(selectAuthReady);
  const isAuthed      = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const router   = useRouter();
  useIdleLogout();

  // No manual-logout click involved here — this is the actual gate: once rehydration
  // has run and there's still no valid session (never logged in, or rehydrateAuth
  // rejected a stale/expired token), stop rendering this portal and bounce to login
  // instead of silently showing an empty shell with no data.
  useEffect(() => {
    if (authReady && !isAuthed) router.replace('/login');
  }, [authReady, isAuthed, router]);

  const [openSection, setOpenSection] = useState(() => getSectionForItem(activeSection));
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Redux's auth rehydration (from localStorage) can complete before this component's
  // own hydration pass reaches it, so `user` may already differ from what the server
  // rendered (which always sees a logged-out/null user). Gate the real name behind a
  // mount flag so both the server and the client's FIRST paint agree on "Admin", then
  // swap to the real name in an effect — a normal post-hydration update, not a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    setPanelOpen(false);
    setOpenSection(getSectionForItem(activeSection));
    sessionStorage.setItem('sidebarPanelOpen', 'false');
  }

  function toggleMobileMenu() {
    if (mobileMenuOpen) {
      closeMobileMenu();
    } else {
      setMobileMenuOpen(true);
      setPanelOpen(true);
      sessionStorage.setItem('sidebarPanelOpen', 'true');
    }
  }

  useLayoutEffect(() => {
    if (sessionStorage.getItem('sidebarPanelOpen') === 'true') {
      setPanelOpen(true);
    }
  }, []);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const [notifications, setNotifications] = useState([
    { id: 1, time: '1d' },
    { id: 2, time: '1d' },
    { id: 3, time: '1d' },
    { id: 4, time: '1d' },
    { id: 5, time: '1d' },
    { id: 6, time: '1d' },
  ]);

  useEffect(() => {
    setOpenSection(getSectionForItem(activeSection));
  }, [activeSection]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  function handleClearAll() { setNotifications([]); }
  function handleDismiss(id) { setNotifications(prev => prev.filter(n => n.id !== id)); }

  function handleLogout() {
    dispatch(clearAuth());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('BHARAT_TOKEN');
    }
    router.replace('/login');
  }

  const userName = mounted ? (user?.name || user?.email || 'Admin') : 'Admin';
  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const activeItem = SECTIONS.flatMap(sec => sec.items).find(i => i.id === activeSection);
  const currentPageLabel = activeItem?.label || 'Dashboard';

  return (
    <div className={s.shell} data-superadmin="true">
      {/* ── Sidebar ── */}
      <aside className={`${s.sidebar}${mobileMenuOpen ? ` ${s.sidebarMobileOpen}` : ''}`}>
        {/* Left icon strip */}
        <div className={s.iconStrip}>
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              className={`${s.stripBtn} ${openSection.id === sec.id ? s.stripBtnActive : ''}`}
              onClick={() => { setOpenSection(sec); setPanelOpen(true); sessionStorage.setItem('sidebarPanelOpen', 'true'); }}
              title={sec.label}
            >
              <span className={s.stripIcon}>{sec.icon}</span>
            </button>
          ))}
          <div className={s.stripSpacer} />
          <button
            className={s.stripBtn}
            onClick={handleLogout}
            title="Logout"
          >
            <span className={s.stripIcon}>{Icon.logout}</span>
          </button>
        </div>

        {/* Right nav panel */}
        <div className={`${s.navPanel}${!panelOpen ? ` ${s.navPanelHidden}` : ''}`}>
          <div className={s.navPanelHeader}>
            <button
              className={s.backBtn}
              title="Collapse"
              onClick={closeMobileMenu}
            >
              <span className={s.backBtnIcon}>{Icon.chevronLeft}</span>
            </button>
            <span className={s.navPanelTitle}>{openSection.label}</span>
          </div>
          <div className={s.navList}>
            {openSection.items.map(item => (
              <button
                key={item.id}
                className={`${s.navItem} ${activeSection === item.id ? s.navItemActive : ''}`}
                onClick={() => { router.push(item.path); setMobileMenuOpen(false); }}
              >
                <span className={s.navItemIcon}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Mobile nav-panel backdrop ── */}
      {mobileMenuOpen && (
        <div
          className={s.backdrop}
          onClick={closeMobileMenu}
        />
      )}

      {/* ── Full-width topbar ── */}
      <header className={s.topbar}>
        <div className={s.topbarLeft}>
          <button
            className={s.hamburgerBtn}
            title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? Icon.close : Icon.menu}
          </button>
          <div className={s.topbarLogo}>
            <img src="/logo.png" alt="sikhoaurbadho" className={s.logoImg} />
          </div>
          <div className={s.breadcrumb}>
            Super Admin / <strong>{currentPageLabel}</strong>
          </div>
        </div>
        <div className={s.topbarActions}>
          <button className={s.topbarBtn} title="Help">{Icon.help}</button>
          <div className={s.notifWrapper} ref={notifRef}>
            <button
              className={s.topbarBtn}
              title="Notifications"
              onClick={() => setNotifOpen(o => !o)}
            >
              {Icon.bell}
              {notifications.length > 0 && (
                <span className={s.notifBadge}>{notifications.length}</span>
              )}
            </button>

              {notifOpen && (
                <div className={s.notifDropdown}>
                  <div className={s.notifHeader}>
                    <div>
                      <div className={s.notifTitle}>Notifications</div>
                      <div className={s.notifSubtitle}>Total Numbers of Notifications</div>
                    </div>
                    <button className={s.notifClearAll} onClick={handleClearAll}>Clear All</button>
                  </div>
                  <div className={s.notifList}>
                    {notifications.length === 0 ? (
                      <div className={s.notifEmpty}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={s.notifItem}>
                          <span className={s.notifItemIcon}>{Icon.bell}</span>
                          <span className={s.notifItemText}>
                            Lorem Ipsum is <strong>simply dummy text</strong> of the printing...
                          </span>
                          <span className={s.notifItemTime}>{n.time}</span>
                          <button
                            className={s.notifItemMenu}
                            onClick={() => handleDismiss(n.id)}
                            title="Dismiss"
                          >···</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={s.userMenuWrapper} ref={userMenuRef}>
              <button
                className={s.avatarBtn}
                title={userName}
                onClick={() => setUserMenuOpen(o => !o)}
              >
                {initials}
              </button>
              {userMenuOpen && (
                <div className={s.userMenuDropdown}>
                  <div className={s.userMenuHeader}>
                    <div className={s.userMenuAvatar}>{initials}</div>
                    <div className={s.userMenuInfo}>
                      <div className={s.userMenuName}>{userName}</div>
                      {user?.email && <div className={s.userMenuEmail}>{user.email}</div>}
                    </div>
                  </div>
                  <div className={s.userMenuDivider} />
                  <button className={s.userMenuLogout} onClick={handleLogout}>
                    <span className={s.userMenuLogoutIcon}>{Icon.logout}</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

      {/* ── Main ── */}
      <div className={`${s.main}${panelOpen ? ` ${s.mainExpanded}` : ''}`}>
        <div className={s.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
