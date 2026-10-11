import {
  ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown,
  ClipboardCheck, Menu, PackageCheck, ShieldCheck,
  ShoppingBag, Truck, Users, X,
} from 'lucide-react'
import { useState } from 'react'
import './landing.css'

const benefits = [
  {
    icon: ClipboardCheck,
    number: '01',
    title: 'Chaque commande, au bon endroit',
    text: 'Retrouvez les commandes Shopify et les ventes saisies à la main dans une seule vue, prêtes à être traitées.',
    color: 'blue',
  },
  {
    icon: Users,
    number: '02',
    title: 'Une équipe qui sait quoi faire',
    text: 'Attribuez les commandes aux bons membres et gardez une vue claire sur les responsabilités de chacun.',
    color: 'green',
  },
  {
    icon: PackageCheck,
    number: '03',
    title: 'Un catalogue sous contrôle',
    text: 'Consultez prix, coûts et niveaux de stock sans jongler entre plusieurs outils.',
    color: 'orange',
  },
  {
    icon: BarChart3,
    number: '04',
    title: 'Des chiffres faciles à lire',
    text: 'Suivez les commandes et le chiffre d’affaires livré depuis un tableau de bord conçu pour agir.',
    color: 'violet',
  },
]

const questions = [
  ['À qui s’adresse Sellmaster ?', 'Sellmaster aide les e-commerçants et leurs équipes à centraliser les commandes, le catalogue et les opérations quotidiennes.'],
  ['Puis-je connecter ma boutique Shopify ?', 'Oui. Connectez votre boutique Shopify depuis Sellmaster ou depuis le connecteur Chrome, puis gérez les boutiques connectées depuis votre espace.'],
  ['Mon équipe peut-elle utiliser Sellmaster ?', 'Oui. Les rôles et accès de l’équipe permettent de travailler avec des managers, closers et livreurs selon les besoins de votre activité.'],
  ['Comment accéder à mon espace ?', 'Connectez-vous avec votre compte Sellmaster existant. Votre tableau de bord s’ouvre ensuite avec les données associées à votre compte.'],
]

function DashboardPreview() {
  return (
    <div className="landing-preview" aria-label="Aperçu du tableau de bord Sellmaster">
      <div className="preview-window-bar"><span /><span /><span /><small>sellmaster.site / overview</small><i><ArrowUpRight size={13} /></i></div>
      <div className="preview-layout">
        <aside className="preview-sidebar"><div className="preview-logo"><span>S</span><b>SELLMASTER</b></div><div className="preview-nav active"><BarChart3 size={14} />Vue d’ensemble</div><div className="preview-nav"><ClipboardCheck size={14} />Commandes</div><div className="preview-nav"><PackageCheck size={14} />Produits</div><div className="preview-nav"><ShoppingBag size={14} />Boutiques</div><div className="preview-user"><span>AM</span><small>Alex Morgan<br /><em>Propriétaire</em></small></div></aside>
        <div className="preview-main"><div className="preview-title"><div><small>VOTRE ACTIVITÉ · AUJOURD’HUI</small><strong>Un bonjour, Alex.</strong></div><span>Mis à jour à l’instant <i /></span></div>
          <div className="preview-metrics"><div><small>Commandes</small><strong>128</strong><em><ArrowUpRight size={12} /> 12,8%</em></div><div><small>Livrées</small><strong>94</strong><em><Check size={12} /> 73,4%</em></div><div><small>Chiffre livré</small><strong>4 820 €</strong><em className="metric-neutral">Cette semaine</em></div></div>
          <div className="preview-lower"><div className="preview-chart"><div className="preview-chart-head"><span>Rythme des commandes</span><small>7 derniers jours⌄</small></div><div className="chart-bars" aria-hidden="true">{[36, 54, 42, 69, 49, 82, 63, 95, 74, 58, 87, 68, 100, 78, 91, 61, 83, 70, 97, 76].map((height, index) => <i key={index} style={{ '--bar-height': `${height}%` }} />)}</div><div className="chart-labels"><span>Lun</span><span>Mer</span><span>Ven</span><span>Dim</span></div></div><div className="preview-recent"><span>À traiter</span><b><i className="status-dot amber" />#SM-2048 <small>En cours</small></b><b><i className="status-dot blue" />#SM-2047 <small>Assignée</small></b><b><i className="status-dot green" />#SM-2046 <small>Livrée</small></b></div></div>
        </div>
      </div>
      <div className="preview-float"><span><Truck size={16} /></span><div><b>Une équipe alignée</b><small>Commandes suivies en temps réel</small></div><Check size={16} /></div>
    </div>
  )
}

export default function LandingPage({ onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <main className="landing-page">
      <section className="landing-hero" id="top">
        <header className="landing-header">
          <a className="landing-brand" href="#top" onClick={closeMenu}><span className="landing-brand-mark">S</span><span>SELLMASTER</span></a>
          <button className="landing-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? 'landing-nav is-open' : 'landing-nav'} aria-label="Navigation principale"><a href="#plateforme" onClick={closeMenu}>La plateforme</a><a href="#comment-ca-marche" onClick={closeMenu}>Comment ça marche</a><a href="#shopify" onClick={closeMenu}>Shopify</a><a href="#questions" onClick={closeMenu}>Questions</a><button className="landing-login-link" onClick={() => { closeMenu(); onLogin() }}>Se connecter</button><button className="landing-header-cta" onClick={() => { closeMenu(); onLogin() }}>Accéder à mon espace <ArrowRight size={15} /></button></nav>
        </header>
        <div className="landing-hero-inner">
          <div className="landing-hero-copy"><span className="landing-kicker"><i /> L’ESPACE DE TRAVAIL DES E-COMMERÇANTS</span><h1>Vos commandes avancent.<br /><span>Votre activité aussi.</span></h1><p>Commandes, produits, équipe et boutiques Shopify réunis dans un espace clair. Gardez le fil des opérations et décidez avec les bons chiffres.</p><div className="landing-hero-actions"><button className="landing-primary-cta" onClick={onLogin}>Ouvrir mon espace <ArrowRight size={17} /></button><a className="landing-text-link" href="#plateforme">Découvrir Sellmaster <ArrowDown size={15} /></a></div><div className="landing-hero-proof"><div className="proof-avatars"><span>SM</span><span>EC</span><span>+</span></div><p><strong>Une seule vue pour toute l’activité</strong><small>Du catalogue à la livraison, sans dispersion.</small></p></div></div>
          <DashboardPreview />
        </div>
        <div className="landing-hero-bottom"><span>UNE PLATEFORME, LES OPÉRATIONS ENFIN RÉUNIES</span><div><span><ShoppingBag size={15} /> Shopify</span><span><ClipboardCheck size={15} /> Commandes</span><span><Users size={15} /> Équipe</span><span><BarChart3 size={15} /> Pilotage</span></div></div>
      </section>

      <section className="landing-intro" id="plateforme"><div className="landing-section-label"><span>01 / LE QUOTIDIEN, SIMPLIFIÉ</span><i /></div><div className="landing-intro-grid"><h2>Moins d’outils ouverts.<br /><span>Plus de visibilité.</span></h2><div><p>Quand les commandes, les stocks et les échanges d’équipe sont éparpillés, les détails importants se perdent. Sellmaster rassemble les informations utiles pour suivre chaque étape et garder votre activité lisible.</p><a href="#comment-ca-marche">Voir comment ça marche <ArrowRight size={16} /></a></div></div>
        <div className="landing-benefits">{benefits.map(({ icon: Icon, number, title, text, color }) => <article className={`benefit-item tone-${color}`} key={number}><div className="benefit-top"><span className="benefit-icon"><Icon size={19} /></span><small>{number}</small></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="landing-workflow" id="comment-ca-marche"><div className="workflow-copy"><div className="landing-section-label"><span>02 / UN FLUX LISIBLE</span><i /></div><h2>De la commande<br />à l’action suivante.</h2><p className="workflow-lead">Gardez chaque étape visible et donnez à votre équipe le contexte nécessaire pour avancer.</p><ol className="workflow-steps"><li><span>1</span><div><b>Centralisez</b><p>Retrouvez vos ventes Shopify et vos commandes manuelles au même endroit.</p></div></li><li><span>2</span><div><b>Organisez</b><p>Suivez les statuts et attribuez les commandes aux personnes concernées.</p></div></li><li><span>3</span><div><b>Pilotez</b><p>Consultez les résultats du jour et concentrez-vous sur les priorités.</p></div></li></ol><button className="workflow-cta" onClick={onLogin}>Continuer vers mon espace <ArrowRight size={16} /></button></div><div className="workflow-visual"><div className="workflow-visual-head"><span>FLUX DE TRAVAIL</span><span><i /> ACTIF</span></div><div className="workflow-track"><article><span className="track-icon shopify"><ShoppingBag size={18} /></span><div><small>COMMANDE REÇUE</small><b>Nouvelle commande Shopify</b><em>À l’instant · #SM-2048</em></div><Check size={16} /></article><div className="track-line" /><article><span className="track-icon assigned"><Users size={18} /></span><div><small>PRISE EN CHARGE</small><b>Attribuée à l’équipe</b><em>Closer · Confirmation en cours</em></div><ArrowRight size={15} /></article><div className="track-line" /><article><span className="track-icon done"><PackageCheck size={18} /></span><div><small>STATUT MIS À JOUR</small><b>Livraison confirmée</b><em>Commande suivie jusqu’au bout</em></div><Check size={16} /></article></div><div className="workflow-visual-foot"><ShieldCheck size={15} /> Un historique clair pour chaque opération</div></div></section>

      <section className="landing-shopify" id="shopify"><div className="shopify-orbit orbit-one" /><div className="shopify-orbit orbit-two" /><div className="shopify-copy"><div className="landing-section-label"><span>03 / VOTRE BOUTIQUE, CONNECTÉE</span><i /></div><span className="shopify-lockup"><ShoppingBag size={21} /> SELLMASTER <span>×</span> SHOPIFY</span><h2>Shopify entre.<br /><em>Le suivi continue.</em></h2><p>Connectez votre boutique Shopify et retrouvez vos commandes dans le même espace que le reste de votre activité. Synchronisez, suivez et gardez le contexte à portée de main.</p><ul><li><Check size={15} /> Connexion sécurisée via Shopify</li><li><Check size={15} /> Boutiques accessibles depuis votre espace</li><li><Check size={15} /> Commandes et produits centralisés</li></ul><button className="landing-primary-cta" onClick={onLogin}>Découvrir l’intégration <ArrowRight size={16} /></button></div><div className="shopify-visual"><div className="shop-card-top"><span className="shop-bag"><ShoppingBag size={22} /></span><span className="shop-connected"><i /> Connectée</span><span className="shop-more">•••</span></div><div className="shop-domain">ma-boutique.myshopify.com</div><div className="shop-sync-row"><span>Dernière synchronisation</span><b>À l’instant</b></div><div className="shop-stats"><div><small>Commandes importées</small><b>1 284</b><span>Depuis la connexion</span></div><div><small>Produits au catalogue</small><b>86</b><span>Synchronisés</span></div></div><div className="shop-activity"><span className="activity-check"><Check size={13} /></span><span><b>Synchronisation terminée</b><small>Vos données sont à jour.</small></span><ArrowUpRight size={15} /></div></div></section>

      <section className="landing-faq" id="questions"><div className="faq-heading"><div className="landing-section-label"><span>04 / BESOIN DE SAVOIR</span><i /></div><h2>Les questions<br />qu’on nous pose.</h2><p>Tout ce qu’il faut savoir pour commencer avec Sellmaster.</p></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>

      <section className="landing-final-cta"><div className="final-cta-orbit" /><div className="landing-section-label"><span>VOTRE ACTIVITÉ, ENFIN AU MÊME ENDROIT</span><i /></div><h2>Prêt à reprendre<br />le fil des opérations ?</h2><p>Connectez-vous et retrouvez votre espace de travail Sellmaster.</p><button className="landing-final-button" onClick={onLogin}>Accéder à Sellmaster <ArrowRight size={17} /></button></section>

      <footer className="landing-footer"><a className="landing-brand" href="#top"><span className="landing-brand-mark">S</span><span>SELLMASTER</span></a><p>Un espace clair pour faire avancer votre e-commerce.</p><div><a href="#plateforme">La plateforme</a><a href="#shopify">Shopify</a><a href="mailto:support@sellmaster.app">Support</a><span>© 2026 Sellmaster</span></div></footer>
    </main>
  )
}