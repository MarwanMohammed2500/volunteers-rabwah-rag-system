import logo from '../../../../public/logo.png';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-neutral-100 w-[1800px] h-[100px]">
      <div className="h-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-full">
          <div className="flex items-center">
            <div className="w-[192.5px] h-[82px] flex items-center justify-center ml-3">
              <img 
                src={logo}
                alt="إدارة التطوع"
                className="w-full h-full object-contain"
                style={{
                  width: '192.5px',
                  height: '82px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}