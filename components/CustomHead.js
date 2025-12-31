import Head from 'next/head';

const CustomHead = ({ title, keywords, description }) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="keywords" content={keywords} />
      <meta name="description" content={description} />
      {/* You can add more meta tags as needed */}
    </Head>
  );
};

export default CustomHead;
