interface Props{
  node:any
}

export default function FileSidebar({
  node,
}:Props){
  if(!node) return null;

  return (
    <div className="w-96 border-l p-4 overflow-auto">
      <h2 className="font-bont text-xl mb-4">
        {node.data.label}
      </h2>

      <p className="mb-4">
        {node.data.path}
      </p>

      <h3 className="font-semibold">
        imports
      </h3>

      <ul className="mb-4">
        {node.data.imports?.map(
          (imp:string) =>(
            <li key={imp}>
              {imp}
            </li>
          )
        )}
      </ul>


      <h3 className="font-semibold"> 
        imported By
      </h3>

      <ul className="mb-4" >
        {node.data.importedBy?.map(
          (imp:string) =>(
            <li key={imp}>
              {imp}
            </li>
          )
        )}
      </ul>
    </div>
  )
}