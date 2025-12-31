

// import React, { useEffect, useRef, useState } from 'react';
// import dynamic from 'next/dynamic';
// import { useForm } from 'react-hook-form';
// import axios from 'axios';
// import toast from 'react-hot-toast';
// import 'bootstrap/dist/css/bootstrap.min.css';

// // Dynamically import Editor.js with SSR disabled

// const Editor: React.FC<{ post?: { title?: string; content?: any } }> = ({ post }) => {
//   const { register, handleSubmit, reset, setValue } = useForm({
//     defaultValues: { title: post?.title || '' },
//   });

//   const [imageFile, setImageFile] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const editorRef = useRef<any>(null);

//   useEffect(() => {
//     // Ensure window is defined (client-side)
//     if (typeof window !== 'undefined') {
//          const initializeEditor = async () => {
//         const EditorJS = (await import('@editorjs/editorjs')).default;
//         const Header = (await import('@editorjs/header')).default;
//         const List = (await import('@editorjs/list')).default;
//         // const ImageTool = (await import('@editorjs/image')).default;
//         const Quote = (await import('@editorjs/quote')).default;
//         const Embed = (await import('@editorjs/embed')).default;
//         // const LinkTool = (await import('@editorjs/link')).default;
//         const CodeTool = (await import('@editorjs/code')).default;
//         // const Delimiter = (await import('@editorjs/delimiter')).default;
//         const Table = (await import('@editorjs/table')).default;
//         // const Warning = (await import('@editorjs/warning')).default;
//         // const Marker = (await import('@editorjs/marker')).default;
//         const InlineCode = (await import('@editorjs/inline-code')).default;

//         const EDITOR_JS_TOOLS = {
//           header: {
//             class: Header,
//             inlineToolbar: true,
//             config: {
//               placeholder: 'Enter a header',
//               levels: [2, 3, 4],
//               defaultLevel: 2,
//             },
//           },
//           list: {
//             class: List,
//             inlineToolbar: true,
//           },
          
// //           image: {
// //             class: ImageTool,
// //             config: {
// //               uploader: {
// //               uploadByFile: async (file: File) => {
// //   try {
// //     const formData = new FormData();
// //     formData.append('image', file);

// //     const response = await axios.post('/api/upload', formData, {
// //       headers: {
// //         'Content-Type': 'multipart/form-data',
// //       },
// //     });

// //     if (response.data && response.data.url) {
// //       return {
// //         success: 1,
// //         file: {
// //           url: response.data.url,
// //         },
// //       };
// //     } else {
// //       throw new Error('Upload failed');
// //     }
// //   } catch (error) {
// //     console.error('Image upload failed:', error);
// //     return {
// //       success: 0,
// //       file: {
// //         url: '',
// //       },
// //     };
// //   }
// // },

// //               },
// //             },
// //           },
//           quote: {
//             class: Quote,
//             inlineToolbar: true,
//             config: {
//               quotePlaceholder: 'Enter a quote',
//               captionPlaceholder: "Quote's author",
//             },
//           },

//           embed: {
//             class: Embed,
//             inlineToolbar: true,
//             config: {
//               services: {
//                 youtube: true,
//                 vimeo: true,
//                 twitter: true,
//                 instagram: true,
//                 // Add more embed services as needed
//               },
//             },
//           },

//           // linkTool: {
//           //   class: LinkTool,
//           //   config: {
//           //     endpoint: '/api/fetchUrl', // Your endpoint that provides link data
//           //   },
//           // },
//           code: {
//             class: CodeTool,
//           },
      
//           table: {
//             class: Table,
//             inlineToolbar: true,
//             config: {
//               rows: 2,
//               cols: 3,
//             },
//           },
        
//           inlineCode: {
//             class: InlineCode,
//             shortcut: 'CMD+SHIFT+C',
//           },
         
//           // Add more tools as needed
//         };

//         editorRef.current = new EditorJS({
//           holder: 'editor',
//           placeholder: 'Write your post here...',
//           tools: EDITOR_JS_TOOLS,
//           data: post?.content || {},
//         });
//       };

//       initializeEditor();
//     }

//     return () => {
//       editorRef.current?.destroy();
//       editorRef.current = null;
//     };
//   }, [post]);

//   const convertImageToBase64 = (file: File): Promise<string> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(file);
//       reader.onload = () => resolve(reader.result as string);
//       reader.onerror = (error) => reject(error);
//     });
//   };

//   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       const base64 = await convertImageToBase64(file);
//       setImageFile(base64);
//     }
//   };

//   const onSubmitHandler = async (data: { title: string }) => {
//     if (!editorRef.current) {
//       toast.error('Editor is not initialized yet!');
//       return;
//     }

//     try {
//       const blocks = await editorRef.current.save();
//       if (!blocks || !blocks.blocks.length) {
//         toast.error('Editor content cannot be empty!');
//         return;
//       }

//       setLoading(true);

//       const res = await axios.post('/api/posts', {
//         title: data.title,
//         content: blocks,
//         image: imageFile,
//         postType: 'PUBLISHED',
//       });

//       if (res.status === 201) {
//         toast.success('Post created successfully!');
//         resetForm();
//       } else {
//         toast.error('Failed to publish blog post!');
//       }
//     } catch (error) {
//       console.error('Error saving post:', error);
//       toast.error('Error saving post!');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setValue('title', '');
//     setImageFile(null);
//     editorRef.current?.clear();
//   };

//   return (
//     <div className="blogs-editor">
//       <form onSubmit={handleSubmit(onSubmitHandler)}>
//         <div className="mb-3">
//           <label className="form-label">Post Title</label>
//           <input className="form-control" {...register('title')} required />
//         </div>
//         <div className="mb-3">
//           <label className="form-label">Upload Image</label>
//           <input type="file" className="form-control" onChange={handleImageUpload} />
//         </div>
//         {imageFile && <img src={imageFile} alt="Preview" className="img-thumbnail mb-3" />}
//         <div id="editor" className="border p-3 rounded" />
//         <button className="btn btn-primary mt-3" type="submit" disabled={loading}>
//           {loading ? (
//             <>
//               <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
//               Publishing...
//             </>
//           ) : (
//             'Publish Post'
//           )}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default Editor;


