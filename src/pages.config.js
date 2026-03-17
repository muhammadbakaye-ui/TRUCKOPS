/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDriverDocuments from './pages/AdminDriverDocuments';
import AuditLogPage from './pages/AuditLogPage';
import Companies from './pages/Companies';
import Dashboard from './pages/Dashboard';
import DeletedItems from './pages/DeletedItems';
import DriverStatements from './pages/DriverStatements';
import Drivers from './pages/Drivers';
import FuelImport from './pages/FuelImport';
import InvoiceDetail from './pages/InvoiceDetail';
import Invoices from './pages/Invoices';
import LoadDetail from './pages/LoadDetail';
import Loads from './pages/Loads';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import StatementBuilder from './pages/StatementBuilder';
import Trailers from './pages/Trailers';
import Trucks from './pages/Trucks';
import UploadDocument from './pages/UploadDocument';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDriverDocuments": AdminDriverDocuments,
    "AuditLogPage": AuditLogPage,
    "Companies": Companies,
    "Dashboard": Dashboard,
    "DeletedItems": DeletedItems,
    "DriverStatements": DriverStatements,
    "Drivers": Drivers,
    "FuelImport": FuelImport,
    "InvoiceDetail": InvoiceDetail,
    "Invoices": Invoices,
    "LoadDetail": LoadDetail,
    "Loads": Loads,
    "Reports": Reports,
    "SettingsPage": SettingsPage,
    "StatementBuilder": StatementBuilder,
    "Trailers": Trailers,
    "Trucks": Trucks,
    "UploadDocument": UploadDocument,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};