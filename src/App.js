import React, { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import Amplify, { Auth } from 'aws-amplify';
import awsconfig from './aws-exports';
import { Badge,Spinner,Button,Form,Container,Toast} from 'react-bootstrap';
// import { DataStore } from 'aws-amplify';
import { listPosts,listBlogs,listComments,getBlog,getPost,getComment} from './graphql/queries';
import * as queries from './graphql/queries';
import * as mutations from './graphql/mutations';
import * as subscriptions from './graphql/subscriptions';
import 'bootstrap/dist/css/bootstrap.min.css'

Amplify.configure(awsconfig);


function parse(ISOString) {

  const todayObject = new Date();
  const dateObject = new Date(Date.parse(ISOString));
  const timeDiff = todayObject - dateObject;
  
  const minutes = timeDiff/60000;
  const hours = minutes/60;
  const days = minutes/24;
  if (minutes<1) {
    return <small>Just Posted <Badge bg="secondary">New</Badge></small>
  }
  else if (minutes < 60) {
    return <small>{Math.round(minutes) + " minutes ago"}</small>
  } else if (hours < 24) {
    return <small>{Math.round(hours) + " hours ago"}</small>
  } else {
  return <small>{dateObject.toLocaleString()}</small>
  }
}
async function createBlog(username,blogName) {
  const blogDetail = {
    id: username,
    name:blogName
  };
  try {
  const newBlog = await API.graphql({
    query: mutations.createBlog,
    variables: {input: blogDetail},
  });
  return newBlog;
  
} catch(e) {console.log(e)}
}





class WritePost extends React.Component {
  constructor(props) {
    super(props);
    this.onSubmit = this.onSubmit.bind(this);
    this.onChange = this.onChange.bind(this);
    this.state = this.state={
      loading:false,
      text:'',
    }
  }

  onChange(event) {
    this.setState({text: event.target.value});

  };
  async onSubmit (event) {
    if (this.state.text === '') {
      alert("Blank Post");
      event.preventDefault();

    } else {
      this.props.functionSubmit(this.state.text);

  //   const userinfo = await Auth.currentUserInfo();
  //   const postDetail = {
  //     blogID: userinfo.username,
  //     title:this.state.text,
      
  //   }
  //   console.log(postDetail);
  //   try {
  //   const newPost = await API.graphql({
  //     query: mutations.createPost,
  //     variables: {input: postDetail},
  //   });
  //   console.log(newPost);
  // } catch(e) {console.log(e)}

    }
  }

  
  render() {
    return (
  <Form onSubmit={this.onSubmit}>
       <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
    <Form.Label>What do you have in mind?</Form.Label>
    <Form.Control as="textarea" rows={3} onChange={this.onChange} placeholder="Start typing..."/>
    <Button variant="primary" type="submit">
    Submit
  </Button>
  </Form.Group>
      </Form>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = this.state={
      loadingNewPost:false,
      loading:false,
      username:'',
      email:'',
      phone:'',
      posts:[],
      blogName:'',
    }
  }



  async handleSubmit (val) {
    this.createPost(this.state.username,val);

  }
  async createPost(blogID,postTitle) {
    this.setState({loadingNewPost:true})

    const postDetail = {
      blogID: blogID,
      title:postTitle
    }
    try {
    const newPost = await API.graphql({
      query: mutations.createPost,
      variables: {input: postDetail},
    });
    await this.state.posts.unshift(newPost.data.createPost);
    this.setState({posts:this.state.posts});
  } catch(e) {console.log(e)}
  this.setState({loadingNewPost:false})


  }
  

  
  async componentDidMount () {
    try {
    const userinfo = await Auth.currentUserInfo();
    this.setState({username:userinfo.username,email:userinfo.attributes.email,phone:userinfo.attributes.phone_number});

    this.checkBlog(userinfo.username);

    } catch(e) {

      console.log(e);
    } 
    }

    
    checkBlog = async(username) => {
      this.setState({loading:true});

      try {
       const blog = await API.graphql(graphqlOperation(queries.getBlog, { id:username }));
       const { data: { listPosts: { items: itemsPage1, nextToken } } } = 
       await API.graphql({ query: listPosts, variables:
         { limit: 20, blogID: {
            eq: this.username // filter priority = 1
        }}});
       if (blog.data.getBlog==null) {
   
       } else {
         this.setState({blogName:blog.data.getBlog.name});
       }
       const items = itemsPage1.filter(function(obj) {
        return obj._deleted!=true
       })
       this.setState({posts:items});
      } catch(e) {
        console.log(e);
      }
      this.setState({loading:false});

   
    }



     handleDelete = async(id) => {
        //delete from file
        //remove from posts

        const postDetail = {
          id: id,
          _version:1
        };
        const newPosts = this.state.posts.filter(function( obj ) {
          return obj.id !== id;
        });
          
      this.setState({posts:newPosts});
      this.setState({loadingNewPost:true});

      try {

       //const post = await API.graphql({query:queries.getPost,variables:postDetail})
      const deletePost = await API.graphql({ query: mutations.deletePost, variables: {input: postDetail}});
      } catch(e) {console.log(e)}
      this.setState({loadingNewPost:false});


     }


  render () {

    let e = "Alert!";
    if (this.state.loading||this.state.loadingNewPost) {
      return (<Spinner animation="border" />)
    } 
  return (
    <Container>
      <h1>{this.state.blogName}</h1>
      
        {this.state.posts.length!=0?this.state.posts.map((item,index)=> {
          console.log(item);
          return (<Toast key={item.id} onClose={()=>this.handleDelete(item.id)}>
            <Toast.Header key={index}>
              <strong className="me-auto">{item.blogID}</strong>
            {parse(item.updatedAt)}
            </Toast.Header>
            <Toast.Body>{item.title}</Toast.Body>
          </Toast>)
        }):<p>You don't have any posts</p>}
      <WritePost value={e} functionSubmit={this.handleSubmit}></WritePost>
      <AmplifySignOut style={styles.signoutButton}>
      </AmplifySignOut>


    </Container>
  );
}
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signoutButton: {
    width:20,
    height:100,
  }
};

export default withAuthenticator(App);