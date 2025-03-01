import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumb({ items, showHome = false }: BreadcrumbProps) {
  return (
    <nav className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-gray-500">
        {showHome && (
          <li>
            <Link to="/" className="hover:text-blue-600">
              Inicio
            </Link>
          </li>
        )}
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {(index > 0 || showHome) && <span className="mx-2">/</span>}
            {item.path ? (
              <Link to={item.path} className="hover:text-blue-600">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
