// components/ViewPost.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

const ViewPost = () => {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);

  useEffect(() => {
    if (id) {
      axios
        .get(`/api/posts/${id}`)
        .then((response) => setPost(response.data))
        .catch((error) => console.error("Error fetching post:", error));
    }
  }, [id]);

  if (!post) return <p>Loading...</p>;

  // Function to render content blocks
  // Function to render content blocks
  // Function to render content blocks
  const renderContent = (content) => {
    return content.blocks.map((block, index) => {
      switch (block.type) {
        case "paragraph":
          return <p key={index}>{block.data.text}</p>;
        case "header":
          return <h2 key={index}>{block.data.text}</h2>;
        case "list":
          const ListTag = block.data.style === "unordered" ? "ul" : "ol";
          return (
            <ListTag key={index} className="or-list">
              {block.data.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {item.content}
                  {item.items && (
                    <div>
                      {item.items.map((subItem, subIndex) => (
                        <li key={subIndex}>{subItem}</li>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ListTag>
          );
        case "image":
          return (
            <div key={index} className="image-block">
              <img
                src={block.data.file?.url} // Ensure this points to the correct URL
                alt={block.data.caption || "Image"}
              />
              {block.data.caption && <p>{block.data.caption}</p>}
            </div>
          );

        case "quote":
          return (
            <blockquote key={index}>
              <p className="text-white">{block.data.text}</p>
              {block.data.caption && (
                <cite className="text-white">{block.data.caption}</cite>
              )}
            </blockquote>
          );

        case "table":
          return (
            <table key={index} className="table-block">
              <tbody>
                {block.data.content.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );

        // Add cases for other block types as needed
        default:
          return <div key={index}>Unsupported block type: {block.type}</div>;
      }
    });
  };

  // Format the creation date
  const formattedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="blog-area single full-blog default-padding">
      <div className="container">
        <div className="blog-items">
          <div className="row">
            <div className="blog-style-one item">
              <div className="blog-item-box">
                <h1>{post.title}</h1>
                <div className="thumb">
                  {post.image && (
                    <Image
                      src={post.image}
                      alt="Blog Cover"
                      width={800} // Adjust width as needed
                      height={600} // Adjust height as needed
                      className="card-img-top"
                    />
                  )}
                </div>
                <div className="info">
                  <div className="meta">
                    <ul>
                      <li>
                        <i className="fas fa-user"></i>{" "}
                        <Link href="#">Md Sohag</Link>
                      </li>
                      <li>
                        <i className="fas fa-calendar-alt"></i>
                        {formattedDate}
                      </li>
                    </ul>
                  </div>
                </div>
                {post.content && renderContent(post.content)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPost;

// // components/ViewPost.js
// import { useRouter } from 'next/router';
// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import Image from 'next/image';
// import Link from 'next/link';

// const ViewPost = () => {
//   const router = useRouter();
//   const { id } = router.query;
//   const [post, setPost] = useState(null);

//   useEffect(() => {
//     if (id) {
//       axios.get(`/api/posts/${id}`)
//         .then((response) => setPost(response.data))
//         .catch((error) => console.error('Error fetching post:', error));
//     }
//   }, [id]);

//   if (!post) return <p>Loading...</p>;

//   // Function to render content blocks
//   const renderContent = (content) => {
//     return content.blocks.map((block, index) => {
//       switch (block.type) {
//         case 'paragraph':
//           return <p key={index}>{block.data.text}</p>;
//         case 'header':
//           return <h2 key={index}>{block.data.text}</h2>;
//         case 'list':
//           const ListTag = block.data.style === 'unordered' ? 'ul' : 'ol';
//           return (
//             <ListTag key={index} className='or-list'>
//               {block.data.items.map((item, itemIndex) => (
//                 <li key={itemIndex}>
//                   {item.content}
//                   {item.items && (
//                     <ul>
//                       {item.items.map((subItem, subIndex) => (
//                         <li key={subIndex}>{subItem}</li>
//                       ))}
//                     </ul>
//                   )}
//                 </li>
//               ))}
//             </ListTag>
//           );
//         // case 'image':
//         //   return (
//         //     <div key={index} className="image-block">
//         //       <img
//         //         src={block.data.file?.url}
//         //         alt={block.data.caption || 'Image'}
//         //       />
//         //       {block.data.caption && <p>{block.data.caption}</p>}
//         //     </div>
//         //   );
//         case 'quote':
//           return (
//             <blockquote key={index}>
//               <p className="text-white">{block.data.text}</p>
//               {block.data.caption && <cite className='text-white'>{block.data.caption}</cite>}
//             </blockquote>
//           );
//         // case 'embed':
//         //   return (
//         //     <div key={index} className="embed-block">
//         //       <iframe
//         //         src={block.data.embed}
//         //         width={block.data.width || '100%'}
//         //         height={block.data.height || 'auto'}
//         //         frameBorder="0"
//         //         allowFullScreen
//         //         title={block.data.caption || 'Embedded content'}
//         //       ></iframe>
//         //       {block.data.caption && <p>{block.data.caption}</p>}
//         //     </div>
//         //   );
//         // case 'linkTool':
//         //   return (
//         //     <div key={index} className="link-tool-block">
//         //       <a href={block.data.link} target="_blank" rel="noopener noreferrer">
//         //         {block.data.meta.image && (
//         //           <img src={block.data.meta.image.url} alt={block.data.meta.title} />
//         //         )}
//         //         <div>
//         //           <h4>{block.data.meta.title}</h4>
//         //           <p>{block.data.meta.description}</p>
//         //         </div>
//         //       </a>
//         //     </div>
//         //   );
//         case 'code':
//           return (
//             <pre key={index} className="code-block">
//               <code>{block.data.code}</code>
//             </pre>
//           );
//         case 'table':
//           return (
//             <table key={index} className="table-block">
//               <tbody>
//                 {block.data.content.map((row, rowIndex) => (
//                   <tr key={rowIndex}>
//                     {row.map((cell, cellIndex) => (
//                       <td key={cellIndex}>{cell}</td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           );
//         case 'inlineCode':
//           return (
//             <p key={index}>
//               <code>{block.data.text}</code>
//             </p>
//           );
//         case 'checklist':
//           return (
//             <ul key={index} className="checklist-block">
//               {block.data.items.map((item, itemIndex) => (
//                 <li key={itemIndex}>
//                   <input type="checkbox" checked={item.checked} readOnly />
//                   <span>{item.text}</span>
//                 </li>
//               ))}
//             </ul>
//           );
//         default:
//           return <div key={index}>Unsupported block type: {block.type}</div>;
//       }
//     });
//   };

//   // Format the creation date
//   const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
//     year: 'numeric',
//     month: 'long',
//     day: 'numeric',
//   });

//   return (
//     <div className="blog-area single full-blog default-padding">
//       <div className="container">
//         <div className="blog-items">
//           <div className="row">
//             <div className="blog-style-one item">
//               <div className="blog-item-box">
//                 <h1>{post.title}</h1>
//                 <div className="thumb">
//                   {post.image && (
//                     <Image
//                       src={post.image}
//                       alt="Blog Cover"
//                       width={800}
//                       height={600}
//                       className="card-img-top"
//                     />
//                   )}
//                 </div>
//                 <div className="info">
//                   <div className="meta">
//                     <ul>
//                       <li>
//                         <i className="fas fa-user"></i>{" "}
//                         <Link href="#">Md Sohag</Link>
//                       </li>
//                       <li>
//                         <i className="fas fa-calendar-alt"></i>
//                         {formattedDate}
//                       </li>
//                     </ul>
//                   </div>
//                 </div>
//                 {post.content && renderContent(post.content)}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ViewPost;
