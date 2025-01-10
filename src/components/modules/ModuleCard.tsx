import { Link } from 'react-router-dom';

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  to?: string;
  selected?: boolean;
}

export const ModuleCard = ({ icon, title, onClick, to, selected }: ModuleCardProps) => {
  if (to) {
    return (
      <Link
        to={to}
        className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 
                  flex flex-col items-center justify-center space-y-3 cursor-pointer
                  transform hover:-translate-y-1 hover:bg-gray-50
                  ${selected ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
      >
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 transition-transform duration-200 group-hover:scale-110">
          {icon}
        </div>
        <h3 className="text-base font-medium text-gray-900 text-center">{title}</h3>
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 
                flex flex-col items-center justify-center space-y-3 cursor-pointer
                transform hover:-translate-y-1 hover:bg-gray-50
                ${selected ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
    >
      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 transition-transform duration-200 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-900 text-center">{title}</h3>
    </div>
  );
}; 