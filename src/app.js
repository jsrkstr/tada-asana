// var apiURL = `https://app.asana.com/api/1.0/projects/304439153626197/custom_field_settings`;

var baseApiURL = 'https://app.asana.com/api/1.0/workspaces/20739441009498/tasks/search';

/**
 * Actual demo
 */

var demo = new Vue({

  el: '#app',

  data: {
    projects: [
      { id: 72329208877935, name: '[T] Manticore', color: '#aa62e3' },
      { id: 304439153626197, name: '[T] Griffin', color: '#fd612c' },
      { id: 395771757519195, name: '[T] Chimera', color: '#e7384f' },
      { id: 704031921542960, name: '[T] Billing', color: '#e362e3' },
      { id: 72695051296024, name: '[T] Misc', color: '#ea4d9d' },
      { id: 608106801285869, name: '[T] Infra', color: '#22aaea' }
    ],
    searchText: '',
    tasks: null,
    headers: [
      { text: 'Projects', value: 'projects' },
      { text: 'Type', value: 'type' },
      { text: 'Priority', value: 'priority' },
      { text: 'Assignee', value: 'assigneeName' },
      { text: 'Name', value: 'name' },
      { text: 'Status', value: 'status' }
    ],  
  },

  created: function () {
    this.fetchData()
  },

  computed: {
    enrichedTasks: function() {
      if (!this.tasks) {
        return []
      };

      return this.tasks.map((task) => {
        task.waiting_days = !task.completed ? moment().diff(task.created_at, 'days') : moment(task.completed_at).diff(task.created_at, 'days');
        task.waiting_days = Math.max(task.waiting_days, 1); // min 1
        task.waiting_days_max = Math.min(task.waiting_days, 21) // max 21
        task.type = this.getType(task);
        task.typeColor = this.getTypeColor(task);
        task.priority = this.getPriority(task);
        task.priorityColor = this.getPriorityColor(task);
        task.projects = this.getProjects(task);
        task.projectId = this.getProjectId(task);
        task.assigneeName = task.assignee ? task.assignee.name : '';
        return task;
      })
    },
    apiURL: function() {
      return baseApiURL + `?&limit=50
${this.searchText.length > 3 ? '&text=' + this.searchText : ''}
&opt_fields=
name,completed,start_on,completed_at,modified_at,created_at,assignee.name,description,custom_fields,projects
&created_by.any=27954783206019
&assignee_status=inbox
&assigned_by.any=me`;
    }
  },

  watch: {
    currentBranch: 'fetchData'
  },

  filters: {
    truncate: function (v) {
      var newline = v.indexOf('\n')
      return newline > 0 ? v.slice(0, newline) : v
    },
    formatDate: function (v) {
      return moment(v).format();
    },
    fromNow: function (v) {
      return moment(v).fromNow();
    },
    initials: function (v) {
      var split = v.split(' ');
      return split.map(word => _.head(_.upperFirst(word))).join('');
    },
  },

  methods: {
    onSearch: _.debounce(function() {
      this.fetchData();  
    }, 1000),
    fetchData: function () {
      var xhr = new XMLHttpRequest()
      var self = this
      xhr.open('GET', this.apiURL)
      xhr.setRequestHeader('Authorization', 'Bearer ' + localstorage.getItem('asana_access_token'));
      xhr.onload = function () {
        var res = JSON.parse(xhr.responseText);
        console.log(res);
        self.tasks = res.data;
      }
      xhr.send()
    },
    getPriorityColor: function(task) {
      return _.get(_.find(task.custom_fields, { id: 304579638329901}), 'enum_value.color');
    },
    getPriority: function(task) {
      return _.get(_.find(task.custom_fields, { id: 304579638329901}), 'enum_value.name');
    },
    getTypeColor: function(task) {
      return _.get(_.find(task.custom_fields, { id: 304489422069008}), 'enum_value.color');
    },
    getType: function(task) {
      return _.get(_.find(task.custom_fields, { id: 304489422069008}), 'enum_value.name');
    },
    getProjects: function(task) {
      return task.projects.map(item => {
        return _.find(this.projects, { id: item.id });
      }).filter(item => !!item);
    },
    getProjectId: function(task) {
      var projects = this.getProjects(task);
      return projects.length ? projects[0].id : '';
    }
  }
})
